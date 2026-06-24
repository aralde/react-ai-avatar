/**
 * Reference relay server for the realtime examples (07 voice, 02/03 text).
 *
 * react-ai-avatar is a pure frontend library — it never talks to a model. But a
 * real voice/text app needs a tiny backend that holds the provider API key and
 * proxies it, so the key never reaches the browser. This file is that backend,
 * kept here as a COPY-PASTEABLE REFERENCE — it is not wired into this repo's
 * build and nothing runs it automatically. Drop it into your own server, set the
 * env vars below, and point the client examples at it.
 *
 * It exposes exactly two endpoints, mirroring the two example pipelines:
 *   • WS  /live      — Gemini Live voice relay. Browser streams mic PCM up; the
 *                      server relays the model's base64 PCM + text back down.
 *                      Consumed by examples/07-gemini-live-voice.tsx.
 *   • POST /api/chat — OpenAI-compatible /chat/completions proxy, streamed as SSE.
 *                      Consumed by examples/02 + 03 (text-streaming mouth).
 *   • GET  /api/health
 *
 * The hosted demos on the docs site use a client-side mock instead and need no
 * backend at all — this file is only for wiring the avatar to a REAL provider.
 *
 * Env:
 *   GEMINI_API_KEY     required for /live (Gemini Live)
 *   GEMINI_LIVE_MODEL  optional; Live preview models rotate (default below)
 *   OPENAI_BASE_URL    required for /api/chat (e.g. http://localhost:1234/v1)
 *   OPENAI_API_KEY     optional; often unneeded for local servers
 *   OPENAI_MODEL       optional; default "gpt-4o-mini"
 *   PORT               optional; default 3000 ($PORT on most PaaS)
 *   MAX_SESSIONS_PER_IP optional; default 3
 *
 * Deps (install in your own project): express, ws, @google/genai.
 * Run with any TS runner, e.g. `npx tsx proxy.ts`.
 */
import "dotenv/config";
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

const VOICE_SYSTEM_PROMPT =
  "You are a friendly, concise, and helpful AI assistant. Keep your answers brief and conversational. " +
  "For every response you generate, you MUST strictly structure your text output in the following format: " +
  "State your reasoning/internal thoughts inside `<thought>...</thought>` tags. Keep the reasoning inside " +
  "`<thought>` extremely short, exactly one concise sentence. State your exact spoken response inside " +
  "`<speech>...</speech>` tags. Do not output anything outside these tags, as the user UI parses them in " +
  "real time. CRITICAL: Do NOT voice or speak any of the `<thought>` tags or the text within them. Only " +
  "speak aloud the text content that is inside the `<speech>` tags.";

const TEXT_SYSTEM_PROMPT =
  "You are a friendly, concise, helpful assistant. Structure EVERY response as: " +
  "one short sentence of reasoning inside <thought>...</thought>, then your spoken " +
  "answer inside <speech>...</speech>. Output nothing outside those tags. The UI parses them live.";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/live" });

  // Basic abuse protection: cap concurrent sessions per client IP so a single
  // visitor can't drain the Gemini quota.
  const MAX_SESSIONS_PER_IP = Number(process.env.MAX_SESSIONS_PER_IP) || 3;
  const sessionsPerIp = new Map<string, number>();

  // --- Voice: Gemini Live relay over WebSocket --------------------------------
  wss.on("connection", async (clientWs, req) => {
    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      || req.socket.remoteAddress
      || "unknown";
    const activeSessions = sessionsPerIp.get(clientIp) ?? 0;
    if (activeSessions >= MAX_SESSIONS_PER_IP) {
      console.warn(`[WS] Rejected connection from ${clientIp}: session limit reached`);
      clientWs.send(JSON.stringify({ error: "Too many concurrent sessions. Close another tab and retry." }));
      clientWs.close();
      return;
    }
    sessionsPerIp.set(clientIp, activeSessions + 1);
    clientWs.on("close", () => {
      const count = (sessionsPerIp.get(clientIp) ?? 1) - 1;
      if (count <= 0) sessionsPerIp.delete(clientIp);
      else sessionsPerIp.set(clientIp, count);
    });

    let session: any;

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        clientWs.send(JSON.stringify({ error: "GEMINI_API_KEY is missing on the server" }));
        clientWs.close();
        return;
      }

      const ai = new GoogleGenAI({ apiKey });

      session = await ai.live.connect({
        // Live API preview models rotate; override without a deploy
        model: process.env.GEMINI_LIVE_MODEL || "gemini-3.1-flash-live-preview",
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
                }
                if (part.text) {
                  clientWs.send(JSON.stringify({ text: part.text }));
                }
              }
            }

            // Relay audio transcription so the client can show precise subtitles.
            const transcriptionText = message.serverContent?.outputTranscription?.text;
            if (transcriptionText) {
              clientWs.send(JSON.stringify({ transcription: transcriptionText }));
            }

            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
            if (message.serverContent?.turnComplete) {
              clientWs.send(JSON.stringify({ turnComplete: true }));
            }
          },
          onerror: (err) => {
            console.error("[Gemini-WS] Error:", err);
            clientWs.send(JSON.stringify({ error: err.message || "An error occurred in Gemini API" }));
          },
          onclose: () => clientWs.close(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: VOICE_SYSTEM_PROMPT,
          outputAudioTranscription: {},
        },
      });

      clientWs.send(JSON.stringify({ connected: true }));

      clientWs.on("message", (data) => {
        try {
          const { audio } = JSON.parse(data.toString());
          if (audio && session) {
            session.sendRealtimeInput({
              audio: { data: audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
        } catch (e) {
          console.error("[Gemini-WS] Error processing client message:", e);
        }
      });

      clientWs.on("close", () => {
        try {
          if (session) session.close();
        } catch {}
      });
    } catch (e: any) {
      console.error("[WS] Setup error:", e);
      clientWs.send(JSON.stringify({ error: e.message }));
      clientWs.close();
    }
  });

  // --- Text: OpenAI-compatible /chat/completions proxy, streamed as SSE -------
  // The text counterpart to the voice WS: the model returns no audio, only
  // tokens streamed over Server-Sent Events. The browser turns that token
  // cadence into a mouth via createSpeechActivity(). We proxy server-side so the
  // API key (if any) never reaches the client.
  app.use(express.json());

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  const writeSse = (res: any, obj: unknown) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  app.post("/api/chat", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const userMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const baseUrl = process.env.OPENAI_BASE_URL;
    if (!baseUrl) {
      writeSse(res, { error: "OPENAI_BASE_URL is not set on the server" });
      res.end();
      return;
    }

    try {
      const upstream = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.OPENAI_API_KEY
            ? { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
            : {}),
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          stream: true,
          messages: [{ role: "system", content: TEXT_SYSTEM_PROMPT }, ...userMessages],
        }),
      });

      if (!upstream.ok || !upstream.body) {
        const detail = await upstream.text().catch(() => "");
        throw new Error(`Upstream ${upstream.status}: ${detail.slice(0, 200)}`);
      }

      // Parse the upstream OpenAI SSE stream and relay only the text deltas.
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      req.on("close", () => reader.cancel().catch(() => {}));

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) writeSse(res, { text: delta });
          } catch {
            // Ignore keep-alive comments / partial frames.
          }
        }
      }
      writeSse(res, { done: true });
      res.end();
    } catch (e: any) {
      console.error("[Chat] Error:", e);
      writeSse(res, { error: e.message || "Chat stream failed" });
      res.end();
    }
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Relay server running on http://localhost:${PORT}`);
  });
}

startServer();
