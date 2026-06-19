import React, { useEffect, useRef } from 'react';
import { AvatarState } from '../lib/types';

export interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  state: AvatarState;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  stateColors?: {
    idle?: string;
    listening?: string;
    thinking?: string;
    speaking?: string;
    working?: string;
  };
}

function hexToRgba(color: string, opacity: number): string {
  if (!color || !color.startsWith('#')) return color || 'transparent';
  const cleanHex = color.replace('#', '');
  let r = 0, g = 0, b = 0;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function AudioVisualizer({ 
  analyser, 
  state, 
  height = 80,
  className = '',
  style,
  stateColors
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  // Resolved state colors
  const resolvedStateColors = {
    idle: stateColors?.idle ?? '#9ca3af',
    listening: stateColors?.listening ?? '#3b82f6',
    thinking: stateColors?.thinking ?? '#8b5cf6',
    speaking: stateColors?.speaking ?? '#10b981',
    working: stateColors?.working ?? '#f59e0b'
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let bufferLength = 0;
    let dataArray = new Uint8Array(0);

    if (analyser) {
      analyser.fftSize = 128;
      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    }

    const draw = () => {
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      
      // Clear with very slight transparency for a trail effect
      ctx.fillStyle = 'rgba(9, 9, 11, 0.2)';
      ctx.fillRect(0, 0, w, h);

      phaseRef.current += 0.05;
      const phase = phaseRef.current;

      if (state === 'speaking' && analyser) {
        // Real-time audio waveform / frequency bars
        analyser.getByteFrequencyData(dataArray);

        // Draw glowing frequency waves
        ctx.lineWidth = 3;
        ctx.strokeStyle = resolvedStateColors.speaking;
        ctx.shadowBlur = 15;
        ctx.shadowColor = hexToRgba(resolvedStateColors.speaking, 0.6);

        ctx.beginPath();
        const sliceWidth = w / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 255;
          const y = h / 2 + Math.sin(i * 0.15 + phase * 2) * (v * h * 0.4);
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(w, h / 2);
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowBlur = 0;

      } else if (state === 'listening') {
        // Calculate dynamic microphone volume (peak deviation)
        let micVolume = 0;
        if (analyser && dataArray.length > 0) {
          analyser.getByteTimeDomainData(dataArray);
          let maxVal = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const dev = Math.abs(dataArray[i] - 128);
            if (dev > maxVal) maxVal = dev;
          }
          micVolume = Math.min(1.0, maxVal / 128);
        }

        // Base wave height plus dynamic scaling based on mic volume
        const waveBase1 = 4 + micVolume * 36; // scales between 4px and 40px
        const waveBase2 = 3 + micVolume * 27; // scales between 3px and 30px

        // Listening state: Render a dynamic Siri-like pulsing wave
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2.5;

        // Wave 1
        ctx.strokeStyle = hexToRgba(resolvedStateColors.listening, 0.7);
        ctx.shadowColor = hexToRgba(resolvedStateColors.listening, 0.4);
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const y = h / 2 + Math.sin(x * 0.02 + phase * 1.5) * Math.sin(x * 0.005) * waveBase1;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Wave 2
        ctx.strokeStyle = hexToRgba(resolvedStateColors.listening, 0.5);
        ctx.shadowColor = hexToRgba(resolvedStateColors.listening, 0.3);
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const y = h / 2 + Math.sin(x * 0.015 - phase * 1.2 + Math.PI) * Math.sin(x * 0.005) * waveBase2;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.shadowBlur = 0;

      } else if (state === 'thinking') {
        // Thinking state: Render a slow revolving / breathing wave
        ctx.shadowBlur = 10;
        ctx.shadowColor = hexToRgba(resolvedStateColors.thinking, 0.4);
        ctx.lineWidth = 2;
        ctx.strokeStyle = hexToRgba(resolvedStateColors.thinking, 0.7);

        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          // Double sine wave combination
          const y = h / 2 + Math.sin(x * 0.03 + phase) * 5 + Math.sin(x * 0.01 - phase * 0.5) * 8;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

      } else if (state === 'working') {
        // Working state: Render a digital computing-style stepped wave
        ctx.shadowBlur = 10;
        ctx.shadowColor = hexToRgba(resolvedStateColors.working, 0.4);
        ctx.lineWidth = 2;
        ctx.strokeStyle = hexToRgba(resolvedStateColors.working, 0.7);

        ctx.beginPath();
        for (let x = 0; x < w; x += 8) {
          const rawY = h / 2 + Math.sin(x * 0.04 + phase * 2.5) * 12 + Math.cos(x * 0.01 - phase) * 6;
          // Step it (stepped wave)
          const y = h / 2 + Math.round((rawY - h / 2) / 6) * 6;
          if (x === 0) ctx.moveTo(x, y);
          else {
            ctx.lineTo(x, y);
            ctx.lineTo(Math.min(w, x + 8), y);
          }
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

      } else {
        // Idle state: Draw a calm, flat line with a tiny bit of noise
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = hexToRgba(resolvedStateColors.idle, 0.3);
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const y = h / 2 + Math.sin(x * 0.01 + phase * 0.2) * 2;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, state, stateColors]);

  return (
    <div className={`w-full bg-zinc-950/80 border border-zinc-800/40 rounded-xl overflow-hidden p-2 ${className}`} style={style}>
      <div className="flex justify-between items-center px-2 mb-1">
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono font-bold">
          Audio Waveform Telemetry
        </span>
        <span className="flex h-2 w-2 relative">
          <span 
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: resolvedStateColors[state] }}
          />
          <span 
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ backgroundColor: resolvedStateColors[state] }}
          />
        </span>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full block"
        style={{ height }}
      />
    </div>
  );
}
