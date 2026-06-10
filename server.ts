import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { WebSocketServer } from "ws";
import http from "http";
import { generateMockAudioChunk, getAudioEnergy } from "./src/lib/serverUtils";

const MOCK_RESPONSES = [
  "<thought>El usuario se ha conectado exitosamente al canal del avatar neuronal. Veo que el estado inicial de la conexión es estable. Mi instrucción del sistema me pide responder de forma amigable y conversacional, estructurando estrictamente mi salida entre las etiquetas de thought y speech. Además, el usuario me ha solicitado una historia de exactamente cinco líneas en español. " +
  "Procederé de la siguiente manera: " +
  "1. Formularé un saludo inicial cálido. " +
  "2. Escribiré una historia corta de 5 líneas bien definidas que capte el interés. Elegiré la historia de un pequeño robot de silicio que sueña con mirar el universo. " +
  "3. Aseguraré de que todo el pensamiento lógico quede encerrado en esta etiqueta de thought y la narración oral esté dentro de la etiqueta de speech para que el cliente la procese y reproduzca el audio de forma correcta.</thought>" +
  "<speech>¡Hola! ¿Cómo estás? Te voy a contar una historia de cinco líneas. " +
  "Había una vez un pequeño robot de silicio. " +
  "Soñaba con ver las estrellas de cerca. " +
  "Cada noche, programaba su antena hacia el cielo. " +
  "Un día, una estrella fugaz le envió una señal. " +
  "Y en ese instante, supe que no estaba solo en el universo.</speech>",

  "<thought>El usuario ha terminado de hablar y se ha detectado el fin de su intervención por la ausencia de señal de audio. Voy a analizar el contexto. Sigue interesado en escuchar relatos interactivos. Para mantener su atención, voy a optar por una historia fantástica sobre la naturaleza y la creatividad. " +
  "Plan de acción: " +
  "- Mantener el tono positivo y cercano del asistente. " +
  "- Redactar un relato de 5 líneas sobre una pequeña nube de algodón que busca colores en el arcoíris. " +
  "- Revisar que la división de etiquetas esté perfectamente delimitada para evitar que el motor de síntesis de voz en el frontend intente leer en voz alta esta sección de razonamiento interno.</thought>" +
  "<speech>¡Qué interesante! Aquí tienes otra historia corta de cinco líneas. " +
  "Una pequeña nube de algodón flotaba muy alto en el cielo. " +
  "Estaba cansada de ser blanca y decidió buscar colores. " +
  "Voló muy cerca de un arcoíris y se tiñó de rosa y morado. " +
  "Al atardecer, llovió confeti de colores sobre el valle. " +
  "Y desde ese día, todos los campos florecen con alegría.</speech>",

  "<thought>El usuario continúa enganchado en la conversación. Su insistencia demuestra que la simulación de visemas y el streaming de audio base64 están funcionando correctamente y con baja latencia en su navegador. Para esta tercera interacción, quiero ofrecer una historia con un matiz un poco más poético e inspirador. " +
  "Plan del relato: " +
  "- Tema: Un faro solitario en un acantilado que encuentra compañía en una pequeña estrella fugaz. " +
  "- Estructura: Introducción del faro, el conflicto de la soledad, el encuentro mágico con la estrella, la resolución de su guía y el desenlace poético. Exactamente 5 líneas de narración oral. " +
  "- Formato: Todo el razonamiento técnico queda registrado aquí.</thought>" +
  "<speech>¡Me encanta seguir charlando contigo! Aquí va tu historia. " +
  "En un acantilado remoto, un viejo faro guiaba a los barcos. " +
  "Cada noche brillaba con fuerza, sintiéndose solo en el mar. " +
  "Una noche de tormenta, una pequeña estrella cayó en su cúpula. " +
  "Juntos iluminaron el océano entero con destellos plateados. " +
  "Y desde entonces, ningún marinero volvió a perderse.</speech>",

  "<thought>El usuario sigue interactuando de manera activa a través del WebSocket. Esto me permite probar el comportamiento dinámico del Voice Activity Detection (VAD) y la capacidad de interrupción. Para esta respuesta, diseñaré una historia reflexiva sobre el tiempo y las emociones. " +
  "Planificación: " +
  "- Redactar una historia sobre un viejo relojero que construye un reloj capaz de medir momentos felices en lugar de segundos o minutos. " +
  "- Asegurar que la moraleja sea reconfortante: la felicidad hace que el tiempo sea infinito. " +
  "- Formatear la salida asegurando que el cierre de la etiqueta thought y la apertura de speech ocurran sin problemas para que el parser del cliente no experimente lagunas de subtítulos.</thought>" +
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
  const PORT = 3000;

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/live' });

  wss.on("connection", async (clientWs) => {
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
