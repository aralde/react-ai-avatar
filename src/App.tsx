import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  AlertCircle, 
  Sparkles, 
  Smile, 
  Captions, 
  CaptionsOff, 
  Cpu, 
  Terminal, 
  User, 
  Activity,
  Clock,
  Settings
} from 'lucide-react';
import { useGeminiLive } from './hooks/useGeminiLive';
import { RealtimeAvatar } from './components/RealtimeAvatar';
import { AudioVisualizer } from './components/AudioVisualizer';

export default function App() {
  const { connect, disconnect, isConnected, state, error, analyser, subtitle, thought } = useGeminiLive();
  const [variant, setVariant] = useState<'default' | 'developer' | 'developer2' | 'custom'>('custom');
  const [showSubtitle, setShowSubtitle] = useState<boolean>(true);
  const [duration, setDuration] = useState<number>(0);

  // Active session timer
  useEffect(() => {
    let interval: any;
    if (isConnected) {
      setDuration(0);
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Human readable description for states
  const telemetryStates = {
    idle: 'Console Standby. Ready to initiate neural link.',
    listening: 'Neural connection open. Listening to audio input...',
    thinking: 'Synthesizing response. Analyzing neural vectors...',
    speaking: 'Broadcasting voice output. Rendering real-time visemes.'
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 lg:p-8 font-sans overflow-x-hidden relative selection:bg-emerald-500/30 selection:text-emerald-400">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-900/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 z-10">
        
        {/* LEFT COLUMN: Controls & Settings (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-6 justify-between">
          
          {/* Header & Logo */}
          <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-6 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Cpu className="w-5 h-5 text-zinc-950 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  NEURAL AVATAR <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-emerald-500/20">v1.1</span>
                </h1>
                <p className="text-xs text-zinc-400 font-medium font-mono uppercase tracking-wider">Gemini Live Control Panel</p>
              </div>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Experience zero-dependency real-time lip-syncing. This dashboard parses raw WebRTC/API audio frequencies on the fly into responsive vector visemes.
            </p>
          </div>

          {/* Real-time Telemetry Visualizer */}
          <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-6 backdrop-blur-md">
            <h2 className="text-xs font-bold font-mono uppercase text-zinc-400 tracking-wider mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Live Telemetry & Signals
            </h2>
            <div className="mb-4">
              <AudioVisualizer analyser={analyser} state={state} height={85} />
            </div>
            <div className="bg-zinc-950/80 border border-zinc-800/50 rounded-xl p-3 flex flex-col gap-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">SESSION STATE:</span>
                <span className={`font-bold ${
                  state === 'speaking' ? 'text-emerald-400' :
                  state === 'listening' ? 'text-blue-400' :
                  state === 'thinking' ? 'text-purple-400' : 'text-zinc-400'
                } uppercase`}>{state}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">LATENCY LINK:</span>
                <span className="text-zinc-300 font-bold">{isConnected ? 'Active (WebSocket)' : 'Offline'}</span>
              </div>
              <div className="text-zinc-400 border-t border-zinc-800/80 mt-2 pt-2 leading-relaxed text-[11px]">
                {telemetryStates[state]}
              </div>
            </div>
          </div>

          {/* Variant Selector (2x2 Grid) */}
          <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-6 backdrop-blur-md">
            <h2 className="text-xs font-bold font-mono uppercase text-zinc-400 tracking-wider mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-purple-400" />
              Avatar Variant Engine
            </h2>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setVariant('default')}
                className={`flex flex-col text-left p-3.5 rounded-xl border transition-all duration-300 group relative overflow-hidden ${
                  variant === 'default'
                    ? 'bg-zinc-800/60 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                    : 'bg-zinc-950/40 border-zinc-800/60 hover:bg-zinc-900/40 hover:border-zinc-700/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Smile className={`w-5 h-5 ${variant === 'default' ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                  {variant === 'default' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </div>
                <span className="text-xs font-bold text-white mb-0.5">Default Smiley</span>
                <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 leading-normal">Basic animated vector shape.</span>
              </button>

              <button
                onClick={() => setVariant('developer')}
                className={`flex flex-col text-left p-3.5 rounded-xl border transition-all duration-300 group relative overflow-hidden ${
                  variant === 'developer'
                    ? 'bg-zinc-800/60 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                    : 'bg-zinc-950/40 border-zinc-800/60 hover:bg-zinc-900/40 hover:border-zinc-700/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <User className={`w-5 h-5 ${variant === 'developer' ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                  {variant === 'developer' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </div>
                <span className="text-xs font-bold text-white mb-0.5">Developer 1</span>
                <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 leading-normal">Casual style with interactive eye tracking.</span>
              </button>

              <button
                onClick={() => setVariant('developer2')}
                className={`flex flex-col text-left p-3.5 rounded-xl border transition-all duration-300 group relative overflow-hidden ${
                  variant === 'developer2'
                    ? 'bg-zinc-800/60 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                    : 'bg-zinc-950/40 border-zinc-800/60 hover:bg-zinc-900/40 hover:border-zinc-700/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Cpu className={`w-5 h-5 ${variant === 'developer2' ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                  {variant === 'developer2' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </div>
                <span className="text-xs font-bold text-white mb-0.5">Developer 2</span>
                <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 leading-normal">High-fidelity SVG coder with detailed layout.</span>
              </button>

              <button
                onClick={() => setVariant('custom')}
                className={`flex flex-col text-left p-3.5 rounded-xl border transition-all duration-300 group relative overflow-hidden ${
                  variant === 'custom'
                    ? 'bg-zinc-800/60 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                    : 'bg-zinc-950/40 border-zinc-800/60 hover:bg-zinc-900/40 hover:border-zinc-700/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Terminal className={`w-5 h-5 ${variant === 'custom' ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                  {variant === 'custom' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </div>
                <span className="text-xs font-bold text-white mb-0.5">Custom (CLI)</span>
                <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 leading-normal">Your custom SVG, compiled via our AI Agent builder.</span>
              </button>
            </div>
          </div>

          {/* Action Trigger / Button */}
          <div className="flex flex-col gap-3">
            <button
              onClick={isConnected ? disconnect : connect}
              disabled={state === 'thinking'}
              className={`
                w-full flex items-center justify-center gap-3 px-6 py-4.5 rounded-2xl font-bold text-base transition-all duration-300 active:scale-98
                ${isConnected 
                  ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30' 
                  : 'bg-emerald-500 hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] text-zinc-950 border border-emerald-400/20'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isConnected ? (
                <>
                  <MicOff className="w-5 h-5 stroke-[2.5]" />
                  DISCONNECT SESSION
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 stroke-[2.5]" />
                  ESTABLISH NEURAL CONNECT
                </>
              )}
            </button>

            {/* Session Time & Error banner */}
            {isConnected && (
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-900/20 py-2 border border-zinc-800/40 rounded-xl">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>ACTIVE TIME: {formatDuration(duration)}</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2.5 text-red-400 bg-red-500/10 px-4 py-3.5 rounded-xl border border-red-500/20 text-xs leading-normal">
                <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block uppercase font-mono tracking-wider mb-0.5">Connection Error</span>
                  <p className="text-zinc-300">{error}</p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Hologram Stage (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-zinc-900/20 rounded-3xl border border-zinc-800/40 p-6 lg:p-8 backdrop-blur-md min-h-[500px] lg:min-h-[620px] relative overflow-hidden">
          
          {/* Grid background inside stage */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(24,24,27,0.3)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/[0.02] rounded-full blur-[80px] pointer-events-none" />
          
          {/* Stage Header Controls */}
          <div className="flex justify-between items-center z-10 w-full">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
              <span className="text-[10px] font-bold font-mono tracking-widest text-zinc-400 uppercase">
                {isConnected ? 'STREAM CHANNEL ACTIVE' : 'STAGE LINK STANDBY'}
              </span>
            </div>
            
            <button
              onClick={() => setShowSubtitle(!showSubtitle)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all border ${
                showSubtitle 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:text-zinc-300'
              }`}
              title="Toggle Subtitles"
            >
              {showSubtitle ? (
                <>
                  <Captions className="w-3.5 h-3.5" />
                  <span>CAPTIONS ON</span>
                </>
              ) : (
                <>
                  <CaptionsOff className="w-3.5 h-3.5" />
                  <span>CAPTIONS OFF</span>
                </>
              )}
            </button>
          </div>

          {/* Center Avatar Core Stage */}
          <div className="flex-1 flex items-center justify-center w-full my-8 min-h-[350px]">
            <RealtimeAvatar 
              state={state} 
              analyser={analyser} 
              size={320} 
              variant={variant} 
              subtitle={subtitle}
              thought={thought}
              showSubtitle={showSubtitle}
            />
          </div>

          {/* Footer Telemetry Stamp */}
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 border-t border-zinc-800/40 pt-4 z-10">
            <span>CORE NODE: GEMINI-3.1-FLASH-LIVE</span>
            <span className="animate-pulse">SYSTEM ONLINE</span>
          </div>

        </div>

      </div>

    </div>
  );
}

