import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { WebSocketServer } from "ws";
import http from "http";

async function startServer() {
  const app = express();
  const PORT = 3000;

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/live' });

  wss.on("connection", async (clientWs) => {
    let session: any;
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
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
        model: "gemini-3.1-flash-live-preview",
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
          systemInstruction: "You are a friendly, concise, and helpful AI assistant. Keep your answers brief and conversational. For every response you generate, you MUST strictly structure your text output in the following format: State your reasoning/internal thoughts inside `<thought>...</thought>` tags. State your exact spoken response inside `<speech>...</speech>` tags. Do not output anything outside these tags, as the user UI parses them in real time. CRITICAL: Do NOT voice or speak any of the `<thought>` tags or the text within them. Only speak aloud the text content that is inside the `<speech>` tags.",
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
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
