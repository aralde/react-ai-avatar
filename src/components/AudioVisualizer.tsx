import React, { useEffect, useRef } from 'react';
import { AvatarState } from '../hooks/useGeminiLive';

export interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  state: AvatarState;
  height?: number;
}

export function AudioVisualizer({ analyser, state, height = 80 }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

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
        ctx.strokeStyle = '#10b981'; // Emerald
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';

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

        // Wave 1 (Blue)
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)'; // Blue
        ctx.shadowColor = 'rgba(59, 130, 246, 0.4)';
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const y = h / 2 + Math.sin(x * 0.02 + phase * 1.5) * Math.sin(x * 0.005) * waveBase1;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Wave 2 (Cyan)
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)'; // Cyan
        ctx.shadowColor = 'rgba(6, 182, 212, 0.3)';
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
        ctx.shadowColor = 'rgba(139, 92, 246, 0.4)'; // Purple
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.7)';

        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          // Double sine wave combination
          const y = h / 2 + Math.sin(x * 0.03 + phase) * 5 + Math.sin(x * 0.01 - phase * 0.5) * 8;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

      } else {
        // Idle state: Draw a calm, flat line with a tiny bit of noise
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(156, 163, 175, 0.3)'; // Gray-400
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
  }, [analyser, state]);

  return (
    <div className="w-full bg-zinc-950/80 border border-zinc-800/40 rounded-xl overflow-hidden p-2">
      <div className="flex justify-between items-center px-2 mb-1">
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono font-bold">
          Audio Waveform Telemetry
        </span>
        <span className="flex h-2 w-2 relative">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            state === 'speaking' ? 'bg-emerald-400' :
            state === 'listening' ? 'bg-blue-400' :
            state === 'thinking' ? 'bg-purple-400' : 'bg-zinc-400'
          }`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            state === 'speaking' ? 'bg-emerald-500' :
            state === 'listening' ? 'bg-blue-500' :
            state === 'thinking' ? 'bg-purple-500' : 'bg-zinc-500'
          }`} />
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
