import { useState, useRef, useEffect, useCallback } from 'react';
import { AudioStreamer, MicRecorder } from '../lib/audio';

export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking';

export function parseModelText(raw: string): { thought: string; speech: string } {
  let thought = '';
  let speech = '';

  const text = raw.trim();

  // 1. Check if there's any `<thought` tag
  const thoughtStartIdx = text.toLowerCase().indexOf('<thought');
  
  if (thoughtStartIdx !== -1) {
    // Found the start of a thought tag.
    const tagEndIdx = text.indexOf('>', thoughtStartIdx);
    
    if (tagEndIdx !== -1) {
      // The `<thought>` tag is fully opened.
      const contentAfterThoughtStart = text.slice(tagEndIdx + 1);
      
      // Look for `<thought>` closure.
      const thoughtEndIdx = contentAfterThoughtStart.toLowerCase().indexOf('</thought>');
      
      if (thoughtEndIdx !== -1) {
        // Thought is completely closed.
        thought = contentAfterThoughtStart.slice(0, thoughtEndIdx).trim();
        
        // Everything after `</thought>` contains speech.
        const contentAfterThoughtClose = contentAfterThoughtStart.slice(thoughtEndIdx + 10);
        
        // Search for `<speech` tag in remaining content.
        const speechStartIdx = contentAfterThoughtClose.toLowerCase().indexOf('<speech');
        if (speechStartIdx !== -1) {
          const speechTagEndIdx = contentAfterThoughtClose.indexOf('>', speechStartIdx);
          if (speechTagEndIdx !== -1) {
            // `<speech>` is fully opened.
            const contentAfterSpeechStart = contentAfterThoughtClose.slice(speechTagEndIdx + 1);
            const speechEndIdx = contentAfterSpeechStart.toLowerCase().indexOf('</speech>');
            if (speechEndIdx !== -1) {
              speech = contentAfterSpeechStart.slice(0, speechEndIdx).trim();
            } else {
              speech = contentAfterSpeechStart.trim();
            }
          } else {
            // `<speech` is being typed, hide partial tag.
            speech = contentAfterThoughtClose.slice(0, speechStartIdx).trim();
          }
        } else {
          speech = contentAfterThoughtClose.trim();
        }
      } else {
        // Thought is still streaming and not closed yet.
        // If `<speech` starting sequence appears without closing thought first:
        const speechStartIdx = contentAfterThoughtStart.toLowerCase().indexOf('<speech');
        if (speechStartIdx !== -1) {
          thought = contentAfterThoughtStart.slice(0, speechStartIdx).trim();
          const speechTagEndIdx = contentAfterThoughtStart.indexOf('>', speechStartIdx);
          if (speechTagEndIdx !== -1) {
            const contentAfterSpeechStart = contentAfterThoughtStart.slice(speechTagEndIdx + 1);
            const speechEndIdx = contentAfterSpeechStart.toLowerCase().indexOf('</speech>');
            if (speechEndIdx !== -1) {
              speech = contentAfterSpeechStart.slice(0, speechEndIdx).trim();
            } else {
              speech = contentAfterSpeechStart.trim();
            }
          }
        } else {
          thought = contentAfterThoughtStart.trim();
        }
      }
    } else {
      // `<thought` tag itself is being typed. Hide it in subtitles.
      speech = text.slice(0, thoughtStartIdx).trim();
    }
  } else {
    // No `<thought` tag at all. Check if there is `<speech`.
    const speechStartIdx = text.toLowerCase().indexOf('<speech');
    if (speechStartIdx !== -1) {
      const tagEndIdx = text.indexOf('>', speechStartIdx);
      if (tagEndIdx !== -1) {
        const contentAfterSpeechStart = text.slice(tagEndIdx + 1);
        const speechEndIdx = contentAfterSpeechStart.toLowerCase().indexOf('</speech>');
        if (speechEndIdx !== -1) {
          speech = contentAfterSpeechStart.slice(0, speechEndIdx).trim();
        } else {
          speech = contentAfterSpeechStart.trim();
        }
      } else {
        speech = text.slice(0, speechStartIdx).trim();
      }
    } else {
      speech = text;
    }
  }

  // Strip trailing partial tags or stray XML symbols (e.g. <, </, </t, <s, etc.)
  speech = speech.replace(/<\/?[a-zA-Z]*$/g, '').trim();
  thought = thought.replace(/<\/?[a-zA-Z]*$/g, '').trim();

  if (thought.startsWith('>')) {
    thought = thought.slice(1).trim();
  }
  if (speech.startsWith('>')) {
    speech = speech.slice(1).trim();
  }

  // Clean up bold labels like **Thinking** if they slip in
  thought = thought.replace(/^\*\*(.*?)\*\*\s*/i, '$1: ');

  return { thought, speech };
}

export function useGeminiLive() {
  const [state, setState] = useState<AvatarState>('idle');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const micRecorderRef = useRef<MicRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const isTurnInitializedRef = useRef<boolean>(false);
  const rawTextRef = useRef<string>('');
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [subtitle, setSubtitle] = useState<string>('');
  const [thought, setThought] = useState<string>('');

  const disconnect = useCallback(() => {
    micRecorderRef.current?.stop();
    audioStreamerRef.current?.stop();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setState('idle');
    setSubtitle('');
    setThought('');
    isSpeakingRef.current = false;
    isTurnInitializedRef.current = false;
    rawTextRef.current = '';
  }, []);

  const connect = useCallback(async () => {
    try {
      setError(null);
      setState('thinking');
      setSubtitle('');
      setThought('');
      rawTextRef.current = '';
      isTurnInitializedRef.current = false;
      
      const streamer = new AudioStreamer();
      audioStreamerRef.current = streamer;
      setAnalyser(streamer.analyser);
      
      micRecorderRef.current = new MicRecorder();

      // Determine correct WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // We wait for the 'connected' message from server to confirm session is ready
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        
        if (msg.error) {
          setError(msg.error);
          disconnect();
          return;
        }
        
        if (msg.connected) {
          setIsConnected(true);
          setState('listening');
          
          micRecorderRef.current?.start((base64) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ audio: base64 }));
            }
          }).catch(err => {
            console.error("Mic error:", err);
            setError(err.message || 'Microphone access denied');
            disconnect();
          });
        }
        
        // Helper to initialize a new speaking/thinking model turn
        const startNewTurn = () => {
          isTurnInitializedRef.current = true;
          isSpeakingRef.current = true;
          setState('speaking');
          setSubtitle('');
          setThought('');
          rawTextRef.current = '';
        };

        if (msg.audio) {
          if (!isTurnInitializedRef.current) {
            startNewTurn();
          }
          audioStreamerRef.current?.playBase64Audio(msg.audio);
        }

        if (msg.text) {
          if (!isTurnInitializedRef.current) {
            startNewTurn();
          }
          rawTextRef.current += msg.text;
          
          const parsed = parseModelText(rawTextRef.current);
          setThought(parsed.thought);
          setSubtitle(parsed.speech);
        }

        if (msg.transcription) {
          if (!isTurnInitializedRef.current) {
            startNewTurn();
          }
          
          rawTextRef.current += msg.transcription;
          
          const parsed = parseModelText(rawTextRef.current);
          if (parsed.thought) {
            setThought(parsed.thought);
          }
          if (parsed.speech) {
            setSubtitle(parsed.speech);
          } else {
            setSubtitle(rawTextRef.current);
          }
        }
        
        if (msg.interrupted) {
          audioStreamerRef.current?.stop();
          setSubtitle('');
          setThought('');
          isSpeakingRef.current = false;
          isTurnInitializedRef.current = false;
          rawTextRef.current = '';
        }
        
        if (msg.turnComplete) {
          setState('listening');
          isSpeakingRef.current = false;
          isTurnInitializedRef.current = false;
        }
      };

      ws.onerror = (err: any) => {
        console.error("WebSocket error:", err);
        // Do not overwrite more specific errors that came via message
        setError(prev => prev || 'Connection failed');
        disconnect();
      };

      ws.onclose = () => {
        disconnect();
      };

    } catch (err: any) {
      console.error("Connecting error:", err);
      setError(err.message);
      setState('idle');
    }
  }, [disconnect]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    isConnected,
    state,
    error,
    analyser,
    subtitle,
    thought
  };
}
