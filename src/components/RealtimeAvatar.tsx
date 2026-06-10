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
    idle: '#4b5563', // gray-600
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

  // State glows / shadows
  const glowShadows = {
    idle: 'rgba(75, 85, 99, 0.15)',
    listening: 'rgba(59, 130, 246, 0.35)',
    thinking: 'rgba(139, 92, 246, 0.4)',
    speaking: 'rgba(16, 185, 129, 0.45)'
  };

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      
      {/* Futuristic Holographic Projection Ring / Aura Behind Avatar */}
      <motion.div
        className="absolute rounded-full border-2 border-dashed pointer-events-none"
        style={{
          width: size * 1.05,
          height: size * 1.05,
          borderColor: stateColors[state] + '40',
        }}
        animate={{
          rotate: state === 'thinking' ? 360 : 0,
          scale: state === 'speaking' ? [1, 1.03, 1] : 1,
        }}
        transition={{
          rotate: state === 'thinking' ? { repeat: Infinity, duration: 10, ease: "linear" } : { duration: 0.5 },
          scale: state === 'speaking' ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" } : { duration: 0.5 }
        }}
      />

      <motion.div
        className="absolute rounded-full pointer-events-none filter blur-2xl opacity-25"
        style={{
          width: size * 0.9,
          height: size * 0.9,
          backgroundColor: stateColors[state],
        }}
        animate={{
          scale: state === 'speaking' || state === 'thinking' ? [1, 1.2, 1] : 1,
        }}
        transition={{
          repeat: state === 'speaking' || state === 'thinking' ? Infinity : 0,
          duration: 2,
          ease: "easeInOut"
        }}
      />
      
      {/* Absolute center of the avatar image */}
      <div className="w-full h-full relative flex items-center justify-center z-10">
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
          <div className="relative bg-zinc-900/90 backdrop-blur-xl text-zinc-100 px-5 py-4 rounded-3xl shadow-[0_10px_30px_rgba(139,92,246,0.15)] border border-purple-500/25 text-sm italic break-words">
            <div className="text-purple-400 text-[10px] uppercase tracking-widest font-mono font-bold mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              Thought process
            </div>
            <p className="leading-relaxed text-zinc-200">{thought}</p>
            
            {/* Elegant thought trail bubble circles pointing down toward avatar center */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-zinc-900/90 rounded-full border border-purple-500/20 shadow-md backdrop-blur-md"></div>
            <div className="absolute -bottom-6 left-[48%] -translate-x-1/2 w-2.5 h-2.5 bg-zinc-900/90 rounded-full border border-purple-500/15 shadow-sm backdrop-blur-md"></div>
            <div className="absolute -bottom-8 left-[47%] -translate-x-1/2 w-1.5 h-1.5 bg-zinc-900/90 rounded-full border border-purple-500/10 backdrop-blur-md"></div>
          </div>
        </motion.div>
      )}

      {/* Unified State Indicator Pill (Positioned right under the avatar, consistent for all) */}
      <motion.div
        className="absolute -bottom-6 px-4 py-1.5 rounded-full text-xs font-bold text-white uppercase tracking-widest shadow-lg z-30 cursor-default select-none border border-white/10"
        animate={{
          backgroundColor: stateColors[state],
          boxShadow: `0 4px 14px rgba(0,0,0,0.4), 0 0 16px ${glowShadows[state]}`
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
            className="inline-block px-6 py-4 text-base md:text-lg font-medium text-zinc-100 break-words leading-relaxed shadow-2xl border"
            style={{
              textShadow: '0px 1px 3px rgba(0,0,0,0.5)',
              background: 'rgba(9, 9, 11, 0.8)', // zinc-950 at 0.8
              backdropFilter: 'blur(12px)',
              borderColor: 'rgba(63, 63, 70, 0.4)',
              borderRadius: '20px',
            }}
          >
            {subtitle}
          </span>
        </motion.div>
      )}
    </div>
  );
}
