import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { WebSocketServer } from "ws";
import http from "http";
import { generateMockAudioChunk, getAudioEnergy } from "./src/demo/serverUtils";

const MOCK_RESPONSES = [
  "<thought>El usuario se ha conectado exitosamente. Generando un saludo y un cuento corto sobre un robot.</thought>" +
  "<speech>¡Hola! ¿Cómo estás? Te voy a contar una historia de cinco líneas. " +
  "Había una vez un pequeño robot de silicio. " +
  "Soñaba con ver las estrellas de cerca. " +
  "Cada noche, programaba su antena hacia el cielo. " +
  "Un día, una estrella fugaz le envió una señal. " +
  "Y en ese instante, supe que no estaba solo en el universo.</speech>",

  "<thought>El usuario ha terminado de hablar. Generando una historia sobre una pequeña nube.</thought>" +
  "<speech>¡Qué interesante! Aquí tienes otra historia corta de cinco líneas. " +
  "Una pequeña nube de algodón flotaba muy alto en el cielo. " +
  "Estaba cansada de ser blanca y decidió buscar colores. " +
  "Voló muy cerca de un arcoíris y se tiñó de rosa y morado. " +
  "Al atardecer, llovió confeti de colores sobre el valle. " +
  "Y desde ese día, todos los campos florecen con alegría.</speech>",

  "<thought>El usuario continúa conversando. Generando una historia poética sobre un faro.</thought>" +
  "<speech>¡Me encanta seguir charlando contigo! Aquí va tu historia. " +
  "En un acantilado remoto, un viejo faro guiaba a los barcos. " +
  "Cada noche brillaba con fuerza, sintiéndose solo en el mar. " +
  "Una noche de tormenta, una pequeña estrella cayó en su cúpula. " +
  "Juntos iluminaron el océano entero con destellos plateados. " +
  "Y desde entonces, ningún marinero volvió a perderse.</speech>",

  "<thought>El usuario sigue interactuando de manera activa. Generando una historia reflexiva sobre el tiempo.</thought>" +
  "<speech>¡Es genial hablar con alguien tan curioso! Escucha esto. " +
  "Un viejo relojero fabricó un reloj de bolsillo sin manecillas. " +
  "El reloj solo medía los instantes felices de su dueño. " +
  "Cuando el dueño sonreía con sus amigos, el reloj brillaba. " +
  "El tiempo parecía detenerse para atesorar ese momento especial. " +
  "Así aprendieron que los mejores momentos duran para siempre.</speech>"
];

function setupMockSession(clientWs: any) {
  console.log("[Gemini-Mock] Setting up mock connection...");
  
  clientWs.send(JSON.stringify({ connected: true }));
  
  let responseIndex = 0;
  let activeStreamInterval: NodeJS.Timeout | null = null;
  let silenceTimeout: NodeJS.Timeout | null = null;
  let initialGreetingTimeout: NodeJS.Timeout | null = null;
  let isUserSpeaking = false;
  
  const interrupt = () => {
    if (activeStreamInterval) {
      clearInterval(activeStreamInterval);
      activeStreamInterval = null;
      console.log("[Gemini-Mock] Interrupted response stream.");
      clientWs.send(JSON.stringify({ interrupted: true }));
    }
  };

  const startStreaming = (text: string) => {
    interrupt();
    
    let textIndex = 0;
    let audioPhase = 0;
    let isThinking = true;
    
    const chunkSize = 2;
    const intervalMs = 60;
    
    console.log(`[Gemini-Mock] Starting response stream: "${text.substring(0, 60)}..."`);
    
    activeStreamInterval = setInterval(() => {
      if (textIndex >= text.length) {
        if (activeStreamInterval) {
          clearInterval(activeStreamInterval);
          activeStreamInterval = null;
        }
        console.log("[Gemini-Mock] Stream completed.");
        clientWs.send(JSON.stringify({ turnComplete: true }));
        return;
      }
      
      const chunk = text.slice(textIndex, textIndex + chunkSize);
      textIndex += chunkSize;
      
      clientWs.send(JSON.stringify({ text: chunk }));
      
      const streamedSoFar = text.slice(0, textIndex);
      if (streamedSoFar.includes("</thought>")) {
        isThinking = false;
      }
      
      if (!isThinking) {
        const { base64, nextPhase } = generateMockAudioChunk(intervalMs, audioPhase);
        audioPhase = nextPhase;
        clientWs.send(JSON.stringify({ audio: base64 }));
      }
    }, intervalMs);
  };

  const triggerNextResponse = () => {
    const reply = MOCK_RESPONSES[responseIndex % MOCK_RESPONSES.length];
    responseIndex++;
    startStreaming(reply);
  };

  initialGreetingTimeout = setTimeout(() => {
    initialGreetingTimeout = null;
    triggerNextResponse();
  }, 1000);

  clientWs.on("message", (data: any) => {
    try {
      const { audio } = JSON.parse(data.toString());
      if (audio) {
        const rms = getAudioEnergy(audio);
        const speechThreshold = 300;
        
        if (rms > speechThreshold) {
          if (initialGreetingTimeout) {
            clearTimeout(initialGreetingTimeout);
            initialGreetingTimeout = null;
          }
          
          if (!isUserSpeaking) {
            console.log(`[Gemini-Mock] User started speaking (RMS: ${rms.toFixed(1)})`);
            isUserSpeaking = true;
            interrupt();
          }
          
          if (silenceTimeout) {
            clearTimeout(silenceTimeout);
            silenceTimeout = null;
          }
        } else {
          if (isUserSpeaking) {
            console.log(`[Gemini-Mock] User stopped speaking (RMS: ${rms.toFixed(1)}). Waiting for silence...`);
            isUserSpeaking = false;
            
            if (silenceTimeout) {
              clearTimeout(silenceTimeout);
            }
            
            silenceTimeout = setTimeout(() => {
              silenceTimeout = null;
              triggerNextResponse();
            }, 1200);
          }
        }
      }
    } catch (e) {
      console.error("[Gemini-Mock] Error parsing client message:", e);
    }
  });

  clientWs.on("close", () => {
    console.log("[Gemini-Mock] Connection closed.");
    if (activeStreamInterval) clearInterval(activeStreamInterval);
    if (silenceTimeout) clearTimeout(silenceTimeout);
    if (initialGreetingTimeout) clearTimeout(initialGreetingTimeout);
  });
}

async function startServer() {
  const app = express();
  // Cloud Run (and most PaaS) inject the port to listen on via $PORT
  const PORT = Number(process.env.PORT) || 3000;

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/live' });

  // Basic abuse protection: cap concurrent sessions per client IP so a
  // single visitor can't drain the Gemini quota.
  const MAX_SESSIONS_PER_IP = Number(process.env.MAX_SESSIONS_PER_IP) || 3;
  const sessionsPerIp = new Map<string, number>();

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
      const useMock = process.env.MOCK_REALTIME === "true" || !apiKey || apiKey === "mock" || apiKey.includes("placeholder") || apiKey.includes("MY_GEMINI_API_KEY");
      
      if (useMock) {
        setupMockSession(clientWs);
        return;
      }

      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing");
      }
      
      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      session = await ai.live.connect({
        // Live API preview models rotate; override without a deploy
        model: process.env.GEMINI_LIVE_MODEL || "gemini-3.1-flash-live-preview",
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  const audio = part.inlineData.data;
                  console.log(`[Gemini-WS] Relaying model audio to client (${audio.length} bytes, base64)`);
                  clientWs.send(JSON.stringify({ audio }));
                }
                if (part.text) {
                  const text = part.text;
                  console.log(`[Gemini-WS] Relaying model text chunk to client: "${text}"`);
                  clientWs.send(JSON.stringify({ text }));
                }
              }
            }

            // Relay audio transcription text so the client can track precise spoken subtitles in real time
            const transcriptionText = message.serverContent?.outputTranscription?.text;
            if (transcriptionText) {
              console.log(`[Gemini-WS] Relaying model transcript to client: "${transcriptionText}"`);
              clientWs.send(JSON.stringify({ transcription: transcriptionText }));
            }

            if (message.serverContent?.interrupted) {
              console.log(`[Gemini-WS] Relay: Interrupted message sent to client`);
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
            if (message.serverContent?.turnComplete) {
              console.log(`[Gemini-WS] Relay: Turn complete message sent to client`);
              clientWs.send(JSON.stringify({ turnComplete: true }));
            }
          },
          onerror: (err) => {
            console.error("[Gemini-WS] Gemini Error:", err);
            clientWs.send(JSON.stringify({ error: err.message || "An error occurred in Gemini API" }));
          },
          onclose: () => {
            console.log(`[Gemini-WS] Gemini connection closed.`);
            clientWs.close();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are a friendly, concise, and helpful AI assistant. Keep your answers brief and conversational. For every response you generate, you MUST strictly structure your text output in the following format: State your reasoning/internal thoughts inside `<thought>...</thought>` tags. Keep the reasoning inside `<thought>` extremely short, exactly one concise sentence. State your exact spoken response inside `<speech>...</speech>` tags. Do not output anything outside these tags, as the user UI parses them in real time. CRITICAL: Do NOT voice or speak any of the `<thought>` tags or the text within them. Only speak aloud the text content that is inside the `<speech>` tags.",
          outputAudioTranscription: {},
        },
      });

      console.log(`[Gemini-WS] Connection established successfully with Gemini model.`);
      clientWs.send(JSON.stringify({ connected: true }));

      let recvAudioCount = 0;
      clientWs.on("message", (data) => {
        try {
          const { audio } = JSON.parse(data.toString());
          if (audio && session) {
            recvAudioCount++;
            if (recvAudioCount % 15 === 1) {
              console.log(`[Gemini-WS] Received client audio frame #${recvAudioCount} (size: ${audio.length} chars)`);
            }
            session.sendRealtimeInput({
              audio: { data: audio, mimeType: "audio/pcm;rate=16000" }
            });
          }
        } catch (e) {
          console.error("[Gemini-WS] Error processing incoming client WebSocket message:", e);
        }
      });
      
      clientWs.on("close", () => {
        try {
          if (session) session.close();
        } catch (e) {}
      });

    } catch (e: any) {
      console.error("Setup error:", e);
      clientWs.send(JSON.stringify({ error: e.message }));
      clientWs.close();
    }
  });

  // API routes
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Text-streaming LLM endpoint (OpenAI-compatible chat/completions).
  //
  // This is the text counterpart to the Gemini Live voice WebSocket above:
  // the model returns no audio, only tokens streamed over Server-Sent Events.
  // The browser turns that token cadence into a mouth via createSpeechActivity().
  // We proxy server-side so the API key (if any) never reaches the client.
  const TEXT_SYSTEM_PROMPT =
    "You are a friendly, concise, helpful assistant. Structure EVERY response as: " +
    "one short sentence of reasoning inside <thought>...</thought>, then your spoken " +
    "answer inside <speech>...</speech>. Output nothing outside those tags. The UI parses them live.";

  const writeSse = (res: any, obj: unknown) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  // Stream one of the canned MOCK_RESPONSES as SSE, char-chunked like a real model.
  let mockChatIndex = 0;
  function streamMockChat(res: any) {
    const text = MOCK_RESPONSES[mockChatIndex % MOCK_RESPONSES.length];
    mockChatIndex++;
    let i = 0;
    const chunkSize = 3;
    const timer = setInterval(() => {
      if (i >= text.length) {
        clearInterval(timer);
        writeSse(res, { done: true });
        res.end();
        return;
      }
      writeSse(res, { text: text.slice(i, i + chunkSize) });
      i += chunkSize;
    }, 35);
    res.on("close", () => clearInterval(timer));
  }

  app.post("/api/chat", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const userMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const baseUrl = process.env.OPENAI_BASE_URL;
    const useMock = process.env.MOCK_REALTIME === "true" || !baseUrl;

    if (useMock) {
      console.log("[Chat-Mock] Streaming a canned text response.");
      streamMockChat(res);
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

      while (true) {
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
