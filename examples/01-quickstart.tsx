/**
 * 01 · Quick start — the absolute minimum.
 *
 * The only required prop is `state`. With no `analyser`, `speaking` falls back
 * to a synthetic, speech-like mouth pattern — so you get a talking face on
 * screen before any audio or model pipeline exists.
 *
 * Run: drop this into any Vite + React app, then
 *   npm install react-ai-avatar motion
 */
import { useEffect, useState } from 'react';
import { RealtimeAvatar } from 'react-ai-avatar';
import type { AvatarState } from 'react-ai-avatar';
import 'react-ai-avatar/style.css';

export default function QuickStart() {
  // In a real app you resolve this from your AI connection. Here we just cycle
  // through the four states every couple of seconds so you can see each one.
  const [state, setState] = useState<AvatarState>('idle');

  useEffect(() => {
    const cycle: AvatarState[] = ['idle', 'listening', 'thinking', 'speaking'];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % cycle.length;
      setState(cycle[i]);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return <RealtimeAvatar state={state} />;
}
