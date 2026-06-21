/**
 * 06 · Bring your own SVG (`variant="byos"`).
 *
 * Any SVG that exposes the small set of `#rra-*` / `.rra-*` hooks gets the full
 * runtime for free — the same blink, gaze, audio-reactive mouth and thinking
 * bubble as the built-in presets. Your SVG, your license.
 *
 * The contract:
 *   #rra-ring    state ring   -> stroke = stateColors[state]
 *   #rra-mouth   mouth         -> ellipse: ry/rx · rect: height
 *   .rra-pupil   pupils (x2)   -> circle: cx/cy · rect: x/y (gaze, thinking look-up)
 *   .rra-lid     eyelids (x2)  -> height (blink; 0 = open)
 *   #rra-think   thought bubble-> opacity + dots pulse while `thinking`
 *
 * Optional data-* attrs: data-base-x / data-base-y (pupil rest), data-max-height
 * (closed lid height), data-quantize (snap motion to a grid).
 *
 * Run: npm install react-ai-avatar motion
 */
import { RealtimeAvatar } from 'react-ai-avatar';
import 'react-ai-avatar/style.css';

function MyAvatar() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      {/* state ring */}
      <circle id="rra-ring" cx="100" cy="100" r="92" fill="none" stroke="#10b981" strokeWidth="6" />
      <circle cx="100" cy="100" r="80" fill="#fde2c4" />

      {/* eyes: a white, a pupil, and a lid rect that grows to blink */}
      {[70, 130].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="85" r="14" fill="#fff" />
          <circle className="rra-pupil" cx={cx} cy="85" r="6" fill="#2c2c2c" data-base-x={cx} data-base-y={85} />
          <rect className="rra-lid" x={cx - 14} y="71" width="28" height="0" fill="#fde2c4" data-max-height="28" />
        </g>
      ))}

      {/* mouth: an ellipse whose ry the runtime drives with audio amplitude */}
      <ellipse id="rra-mouth" cx="100" cy="135" rx="20" ry="4" fill="#7a3b2e" />

      {/* thought bubble shown while `thinking` */}
      <g id="rra-think" opacity="0">
        <circle cx="150" cy="40" r="10" fill="#fff" stroke="#cbd5e1" />
        <circle cx="150" cy="40" r="2.5" fill="#94a3b8" />
        <circle cx="158" cy="40" r="2.5" fill="#94a3b8" />
        <circle cx="166" cy="40" r="2.5" fill="#94a3b8" />
      </g>
    </svg>
  );
}

export default function BringYourOwnSvg() {
  return (
    <RealtimeAvatar state="speaking" variant="byos">
      <MyAvatar />
    </RealtimeAvatar>
  );
}
