import React, { useState } from 'react';
import { Mic, MicOff, AlertCircle, Sparkles, Smile, Captions, CaptionsOff } from 'lucide-react';
import { useGeminiLive } from './hooks/useGeminiLive';
import { RealtimeAvatar } from './components/RealtimeAvatar';

export default function App() {
  const { connect, disconnect, isConnected, state, error, analyser, subtitle, thought } = useGeminiLive();
  const [variant, setVariant] = useState<'default' | 'developer' | 'developer2' | 'custom'>('custom');
  const [showSubtitle, setShowSubtitle] = useState<boolean>(true);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 font-sans text-zinc-100 overflow-hidden">
      
      {/* Header */}
      <div className="absolute top-8 left-0 right-0 text-center z-50 px-4 flex justify-between items-start max-w-5xl mx-auto">
        <div className="text-left">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            Realtime Avatar
          </h1>
          <p className="text-zinc-400 max-w-md text-sm">
            A configurable React component that connects to Gemini Live API, generates real-time visemes from audio, and animates an SVG avatar.
          </p>
        </div>
        <button
          onClick={() => setShowSubtitle(!showSubtitle)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            showSubtitle ? 'bg-zinc-800 text-white border border-zinc-700' : 'bg-transparent text-zinc-500 hover:text-zinc-300'
          }`}
          title="Toggle Subtitles"
        >
          {showSubtitle ? <Captions className="w-5 h-5" /> : <CaptionsOff className="w-5 h-5" />}
        </button>
      </div>

      {/* Main Avatar Display */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl mt-20">
        
        {/* Variant Toggle */}
        <div className="flex gap-2 mb-12 bg-zinc-900/50 p-1.5 rounded-full border border-zinc-800/50 backdrop-blur-sm z-50">
          <button
            onClick={() => setVariant('default')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              variant === 'default' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Smile className="w-4 h-4" />
            Default
          </button>
          <button
            onClick={() => setVariant('developer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              variant === 'developer' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Developer 1
          </button>
          <button
            onClick={() => setVariant('developer2')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              variant === 'developer2' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Developer 2
          </button>
          <button
            onClick={() => setVariant('custom')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              variant === 'custom' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Custom (CLI)
          </button>
        </div>

        <div className="mb-16 mt-8">
          <RealtimeAvatar 
            state={state} 
            analyser={analyser} 
            size={280} 
            variant={variant} 
            subtitle={subtitle}
            thought={thought}
            showSubtitle={showSubtitle}
          />
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-6">
          <button
            onClick={isConnected ? disconnect : connect}
            disabled={state === 'thinking'}
            className={`
              flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-lg transition-all
              ${isConnected 
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50' 
                : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 hover:scale-105 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isConnected ? (
              <>
                <MicOff className="w-6 h-6" />
                End Conversation
              </>
            ) : (
              <>
                <Mic className="w-6 h-6" />
                Start Conversation
              </>
            )}
          </button>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 px-4 py-3 rounded-xl border border-red-400/20 max-w-md text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-8 text-zinc-500 text-xs text-center">
        Powered by Gemini 3.1 Flash Live Preview
      </div>
    </div>
  );
}
