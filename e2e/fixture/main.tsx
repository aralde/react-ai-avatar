/**
 * Browser-test fixture: renders one avatar picked by `?scene=` and exposes
 * `window.rra` so a test can change props and stream text like a host app.
 */
import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  RealtimeAvatar,
  VideoAvatar,
  createSpeechActivity,
  type RealtimeAvatarProps,
} from '../../src/lib/index';
import { SquirrelAvatar } from '../../src/lib/characters';
import '../../src/lib/lib.css';

type Scene = 'realtime' | 'video' | 'squirrel' | 'byos';

interface Controls {
  set(props: Partial<RealtimeAvatarProps>): void;
  push(chunk: string): void;
  end(): void;
}

declare global {
  interface Window {
    rra: Controls;
  }
}

const params = new URLSearchParams(location.search);
const scene = (params.get('scene') ?? 'realtime') as Scene;
const initial = JSON.parse(params.get('props') ?? '{}') as Partial<RealtimeAvatarProps>;

/** The smallest face on the `#rra-*` contract, like a host's own SVG. */
function ContractFace() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      <circle id="rra-ring" cx="100" cy="100" r="92" fill="none" stroke="#4b5563" strokeWidth="5" />
      <circle cx="100" cy="100" r="80" fill="#f5c7a9" />
      <circle className="rra-pupil" cx="75" cy="90" r="6" />
      <circle className="rra-pupil" cx="125" cy="90" r="6" />
      <rect className="rra-lid" data-max-height="16" x="65" y="80" width="20" height="0" fill="#f5c7a9" />
      <rect className="rra-lid" data-max-height="16" x="115" y="80" width="20" height="0" fill="#f5c7a9" />
      <ellipse id="rra-mouth" cx="100" cy="135" rx="14" ry="2" fill="#7a3b2e" />
      <g id="rra-think" opacity="0">
        <circle cx="160" cy="40" r="6" />
      </g>
    </svg>
  );
}

// Fast blinks so a test sees several within a second.
const BLINKY = { blinkIntervalMin: 150, blinkIntervalMax: 250, blinkDuration: 80 };

function App() {
  const [props, setProps] = useState<Partial<RealtimeAvatarProps>>(initial);
  const activity = useMemo(() => createSpeechActivity(), []);

  useEffect(() => {
    window.rra = {
      set: (next) => setProps((prev) => ({ ...prev, ...next })),
      push: (chunk) => activity.push(chunk),
      end: () => activity.end(),
    };
  }, [activity]);

  if (scene === 'video') {
    return (
      <VideoAvatar
        clips={{ idle: '/clips/idle.mp4', thinking: '/clips/thinking.mp4', speaking: '/clips/speaking.mp4' }}
        minHoldMs={0}
        busySettleMs={0}
        size={240}
        speechActivity={activity}
        {...props}
      />
    );
  }
  if (scene === 'byos') {
    return (
      <RealtimeAvatar {...BLINKY} speechActivity={activity} {...props}>
        <ContractFace />
      </RealtimeAvatar>
    );
  }
  if (scene === 'squirrel') {
    return (
      <RealtimeAvatar {...BLINKY} speechActivity={activity} {...props}>
        <SquirrelAvatar poses />
      </RealtimeAvatar>
    );
  }
  return <RealtimeAvatar {...BLINKY} speechActivity={activity} {...props} />;
}

createRoot(document.getElementById('root')!).render(<App />);
