import React from 'react';
import { DefaultAvatar } from './DefaultAvatar';
import { DeveloperAvatar } from './DeveloperAvatar';
import { DeveloperAvatar2 } from './DeveloperAvatar2';
import { CustomAvatar } from './CustomAvatar';
import { AvatarState } from '../hooks/useGeminiLive';
import { motion } from 'motion/react';

export interface RealtimeAvatarProps {
  state: AvatarState;
  analyser: AnalyserNode | null;
  size?: number;
  variant?: 'default' | 'developer' | 'developer2' | 'custom';
  subtitle?: string;
  thought?: string;
  showSubtitle?: boolean;
}

export function RealtimeAvatar({ 
  state, 
  analyser, 
  size = 280, 
  variant = 'default', 
  subtitle, 
  thought, 
  showSubtitle = true 
}: RealtimeAvatarProps) {
  let AvatarComponent;
  const avatarProps = { state, analyser, size };
  
  if (variant === 'custom') {
    AvatarComponent = <CustomAvatar {...avatarProps} />;
  } else if (variant === 'developer2') {
    AvatarComponent = <DeveloperAvatar2 {...avatarProps} />;
  } else if (variant === 'developer') {
    AvatarComponent = <DeveloperAvatar {...avatarProps} />;
  } else {
    AvatarComponent = <DefaultAvatar {...avatarProps} />;
  }

  // State colors for unified indicator & glow
  const stateColors = {
    idle: '#9ca3af', // gray-400
    listening: '#3b82f6', // blue-500
    thinking: '#8b5cf6', // purple-500
    speaking: '#10b981' // emerald-500
  };

  const stateLabels = {
    idle: 'Idle',
    listening: 'Listening',
    thinking: 'Thinking...',
    speaking: 'Speaking'
  };

  return (
    <div className="relative flex flex-col items-center" style={{ width: size, height: size }}>
      
      {/* Absolute center of the avatar image */}
      <div className="w-full h-full relative flex items-center justify-center">
        {AvatarComponent}
      </div>

      {/* Comic-style Thought Bubble (Floats Center ABOVE the Avatar) */}
      {showSubtitle && thought && (
        <motion.div 
          initial={{ opacity: 0, y: 15, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="absolute bottom-[108%] left-1/2 -translate-x-1/2 w-[90vw] max-w-[340px] md:max-w-[420px] text-left pointer-events-none z-40"
        >
          <div className="relative bg-zinc-900/95 backdrop-blur-md text-zinc-100 px-5 py-4 rounded-3xl shadow-2xl border border-purple-500/30 text-sm italic break-words shadow-purple-500/5">
            <div className="text-purple-400/80 text-[10px] uppercase tracking-widest font-mono font-bold mb-1">Thought process</div>
            <p className="leading-relaxed text-zinc-200">{thought}</p>
            
            {/* Elegant thought trail bubble circles pointing down toward avatar center */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-zinc-900 rounded-full border border-zinc-800 shadow-md"></div>
            <div className="absolute -bottom-6 left-[48%] -translate-x-1/2 w-2.5 h-2.5 bg-zinc-900 rounded-full border border-zinc-800 shadow-sm"></div>
            <div className="absolute -bottom-8 left-[47%] -translate-x-1/2 w-1.5 h-1.5 bg-zinc-900 rounded-full border border-zinc-800"></div>
          </div>
        </motion.div>
      )}

      {/* Unified State Indicator Pill (Positioned right under the avatar, consistent for all) */}
      <motion.div
        className="absolute -bottom-6 px-4 py-1.5 rounded-full text-xs font-bold text-white uppercase tracking-widest shadow-lg z-30 cursor-default select-none border border-white/10"
        animate={{
          backgroundColor: stateColors[state],
          boxShadow: state === 'speaking' || state === 'thinking' 
            ? `0 4px 14px rgba(0,0,0,0.4), 0 0 12px ${stateColors[state]}40` 
            : `0 4px 10px rgba(0,0,0,0.3)`
        }}
        transition={{ duration: 0.3 }}
      >
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full bg-white ${state === 'speaking' || state === 'thinking' ? 'animate-ping' : ''}`} />
          {stateLabels[state]}
        </span>
      </motion.div>

      {/* Movie-style Subtitles Overlay (Floats Centered BELOW the indicator, responsive & generous padding) */}
      {showSubtitle && subtitle && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute top-[115%] left-1/2 -translate-x-1/2 w-[90vw] max-w-[500px] md:max-w-[640px] text-center pointer-events-none z-50 pb-8"
        >
          <span 
            className="inline-block px-5 py-3.5 text-lg md:text-xl font-medium text-white break-words leading-relaxed"
            style={{
              textShadow: '0px 2px 4px rgba(0,0,0,0.8), 0px 0px 8px rgba(0,0,0,0.6)',
              background: 'rgba(9, 9, 11, 0.75)', // zinc-950 at 0.75 opacity for super premium overlay
              backdropFilter: 'blur(8px)',
              borderRadius: '16px',
              border: '1px solid rgba(63, 63, 70, 0.4)' // zinc-700 at 0.4
            }}
          >
            {subtitle}
          </span>
        </motion.div>
      )}
    </div>
  );
}
