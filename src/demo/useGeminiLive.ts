import { useState, useRef, useEffect, useCallback } from 'react';
import { AudioStreamer, MicRecorder } from './audio';
import type { AvatarState } from '../lib/types';

export type { AvatarState };

export function parseModelText(raw: string): { thought: string; tool: string; speech: string } {
  let thought = '';
  let tool = '';
  let speech = '';

  const text = raw.trim();

  // Helper to extract content inside a tag or from tag start to end of text if not closed
  const extractTag = (tagName: string) => {
    const startTag = `<${tagName}`;
    const endTag = `</${tagName}>`;
    const startIdx = text.toLowerCase().indexOf(startTag);
    if (startIdx === -1) return '';
    const closeBracketIdx = text.indexOf('>', startIdx);
    if (closeBracketIdx === -1) return '';
    const endIdx = text.toLowerCase().indexOf(endTag, closeBracketIdx);
    if (endIdx === -1) {
      // Not closed yet, return everything after the opening tag
      // but stop if we encounter another tag
      const remaining = text.slice(closeBracketIdx + 1);
      const nextTagIdx = remaining.indexOf('<');
      if (nextTagIdx !== -1) {
        return remaining.slice(0, nextTagIdx).trim();
      }
      return remaining.trim();
    }
    return text.slice(closeBracketIdx + 1, endIdx).trim();
  };

  thought = extractTag('thought');
  tool = extractTag('tool');
  speech = extractTag('speech');

  // Fallback: if there are no tags at all, treat the whole text as speech
  if (!text.includes('<thought') && !text.includes('<tool') && !text.includes('<speech')) {
    speech = text;
  }

  // Strip trailing partial tags or stray XML symbols (e.g. <, </, </t, <s, etc.)
  speech = speech.replace(/<\/?[a-zA-Z]*$/g, '').trim();
  thought = thought.replace(/<\/?[a-zA-Z]*$/g, '').trim();
  tool = tool.replace(/<\/?[a-zA-Z]*$/g, '').trim();

  if (thought.startsWith('>')) {
    thought = thought.slice(1).trim();
  }
  if (tool.startsWith('>')) {
    tool = tool.slice(1).trim();
  }
  if (speech.startsWith('>')) {
    speech = speech.slice(1).trim();
  }

  // Clean up bold labels like **Thinking** if they slip in
  thought = thought.replace(/^\*\*(.*?)\*\*\s*/i, '$1: ');
  tool = tool.replace(/^\*\*(.*?)\*\*\s*/i, '$1: ');

  return { thought, tool, speech };
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
  const [tool, setTool] = useState<string>('');

  const disconnect = useCallback(() => {
    micRecorderRef.current?.stop();
    audioStreamerRef.current?.close();
    if (wsRef.current) {
      // Detach handlers first: closing fires onclose, which would otherwise
      // re-enter disconnect().
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setState('idle');
    setSubtitle('');
    setThought('');
    setTool('');
    setAnalyser(null);
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
      setTool('');
      rawTextRef.current = '';
      isTurnInitializedRef.current = false;
      
      const streamer = new AudioStreamer();
      audioStreamerRef.current = streamer;
      setAnalyser(null); // start as null since we are thinking/connecting
      
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
          }).then(() => {
            setAnalyser(micRecorderRef.current?.analyser || null);
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
          setState('thinking');
          setSubtitle('');
          setThought('');
          setTool('');
          rawTextRef.current = '';
          setAnalyser(null);
        };

        if (msg.audio) {
          if (!isTurnInitializedRef.current) {
            startNewTurn();
          }
          setState('speaking');
          setAnalyser(audioStreamerRef.current?.analyser || null);
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
          setTool(parsed.tool);

          const isCurrentlyPlaying = audioStreamerRef.current?.isPlaying();
          if (parsed.speech || isCurrentlyPlaying) {
            setState('speaking');
            setAnalyser(audioStreamerRef.current?.analyser || null);
          } else if (parsed.tool) {
            setState('working');
          }
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
          if (parsed.tool) {
            setTool(parsed.tool);
          }

          const isCurrentlyPlaying = audioStreamerRef.current?.isPlaying();
          if (parsed.speech || isCurrentlyPlaying) {
            setSubtitle(parsed.speech || rawTextRef.current);
            setState('speaking');
            setAnalyser(audioStreamerRef.current?.analyser || null);
          } else if (parsed.tool) {
            setState('working');
          } else {
            setSubtitle(rawTextRef.current);
            setState('speaking');
            setAnalyser(audioStreamerRef.current?.analyser || null);
          }
        }
        
        if (msg.interrupted) {
          audioStreamerRef.current?.stop();
          setSubtitle('');
          setThought('');
          setTool('');
          isSpeakingRef.current = false;
          isTurnInitializedRef.current = false;
          rawTextRef.current = '';
          setState('listening');
          setAnalyser(micRecorderRef.current?.analyser || null);
        }
        
        if (msg.turnComplete) {
          const streamer = audioStreamerRef.current;
          if (streamer && streamer.isPlaying()) {
            const delayMs = (streamer.nextStartTime - streamer.audioContext.currentTime) * 1000;
            setTimeout(() => {
              if (isSpeakingRef.current && isTurnInitializedRef.current) {
                setState('listening');
                isSpeakingRef.current = false;
                isTurnInitializedRef.current = false;
                setAnalyser(micRecorderRef.current?.analyser || null);
              }
            }, delayMs + 100);
          } else {
            setState('listening');
            isSpeakingRef.current = false;
            isTurnInitializedRef.current = false;
            setAnalyser(micRecorderRef.current?.analyser || null);
          }
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
    thought,
    tool
  };
}
