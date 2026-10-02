/**
 * 11 · A portrait avatar: the "puppet" technique (`variant="byos"`).
 *
 * Examples 08 and 10 draw a character from scratch in flat vector. This one goes the
 * other way: the illustration is a fixed picture, embedded untouched, and only the
 * parts that move are drawn on top as vector layers colour-matched to it — eyelids,
 * pupils, a mouth, a thought bubble. The `#rra-*` hooks don't care that the face
 * underneath is a raster, so the runtime still gives it blink, gaze, the audio/text
 * mouth and the thinking bubble.
 *
 * Everything else reacts to `state` in CSS: the mouth patches over the picture's grin
 * while talking, the eyes narrow toward the bubble while thinking, and the monitors
 * behind always run scrolling terminal output (masked so it passes behind the head).
 * `poses` opts into the show: a coffee break every 20 s while idle, and a back view
 * facing the monitors while working.
 *
 * Unlike examples 08/10 this isn't a flattened, copy-pasteable SVG — the picture
 * ships as inlined image data — so it imports the packaged component. To build your
 * own from a picture: embed it with <image>, then add the hooks over it:
 *
 *   .rra-lid     a skin-coloured rect over each eye (height 0 = open)
 *   .rra-pupil   a pupil per eye, clipped to the eye so a wide gaze never leaves it
 *   #rra-mouth   an ellipse resting thin over the mouth (ry ≈ 1–3)
 *   #rra-think   a bubble of circles/rects outside the clip
 *
 * Run: npm install react-ai-avatar motion
 */
import { useState } from 'react';
import { RealtimeAvatar, PortraitAvatar, type AvatarState } from 'react-ai-avatar';
import 'react-ai-avatar/style.css';

const STATES: AvatarState[] = ['idle', 'listening', 'thinking', 'speaking', 'working'];

export default function PortraitAvatarExample() {
  const [state, setState] = useState<AvatarState>('idle');

  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 16 }}>
      {/* byos children don't receive `state` from RealtimeAvatar — pass it yourself */}
      <RealtimeAvatar state={state} variant="byos" size={320}>
        <PortraitAvatar state={state} poses />
      </RealtimeAvatar>

      <div style={{ display: 'flex', gap: 8 }}>
        {STATES.map((s) => (
          <button key={s} aria-pressed={s === state} onClick={() => setState(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
