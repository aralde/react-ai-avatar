/**
 * 10 · A second full character avatar (`variant="byos"`).
 *
 * Same idea as example 08 (the squirrel), different species: a young developer —
 * slouchy knit beanie, over-ear headphones, round glasses, hair escaping at the
 * temples, hoodie + circuit tee, and a neck bridging head and body. Two characters
 * built the same way is the point: the `#rra-*` hooks don't care what you draw
 * around them, so the runtime gives both blink, gaze, audio/text mouth and the
 * thinking bubble for free. Your design, your license (this one is MIT, own art).
 *
 * The eyes show the canonical three-layer build, in paint order: eyeball →
 * `.rra-pupil` (with data-base-*) → `.rra-lid` (a skin-colored rect, height 0 =
 * open, painted on top so a blink reads as the face coming down over the eye).
 *
 *   #rra-ring    state ring    -> stroke = stateColors[state]
 *   #rra-mouth   mouth (ellipse, resting ry=2.3) -> ry/rx grow open
 *   .rra-pupil   pupils (x2)   -> cx/cy ease toward gaze / thinking look-up
 *   .rra-lid     eyelids (x2)  -> height (blink; 0 = open), data-max-height to close
 *   #rra-think   thought bubble-> opacity + dots pulse while `thinking`
 *
 * This file is the flattened, copy-pasteable version. The packaged `CoderAvatar`
 * component is the same drawing plus opt-in per-state poses (`poses`): head tilt +
 * hand on chin while thinking, and a typing-on-a-laptop / reading-a-book scene
 * while working.
 *
 * Run: npm install react-ai-avatar motion
 */
import { RealtimeAvatar } from 'react-ai-avatar';
import 'react-ai-avatar/style.css';

/** The skin color is reused for BOTH eyelids — recolor it and blinks stay correct. */
const SKIN = '#e8b083';
const SKIN_SHADOW = '#be8256';
const HAIR = '#3a2820';
const HOODIE = '#2b2f36';

function CoderAvatar() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Developer avatar">
      <circle id="rra-ring" cx="100" cy="100" r="92" fill="none" stroke="#4b5563" strokeWidth="5" />
      <circle cx="100" cy="100" r="79" fill="#6fb3bd" />
      <clipPath id="cdclip"><circle cx="100" cy="100" r="79" /></clipPath>
      <g clipPath="url(#cdclip)">
        {/* neck: skin from chin into the collar + a chin shadow for volume */}
        <path d="M85 118 Q83 140 80 152 L120 152 Q117 140 115 118 Z" fill={SKIN} />
        <path d="M85 132 Q100 145 115 132 Q100 141 85 132 Z" fill="#a26c40" opacity="0.45" />

        {/* body: the tee is painted FIRST as a plain block and the hoodie goes
            OVER it with a V cut out of its neckline, so the visible V is a hole
            in the hoodie and the two shapes stay aligned by construction */}
        <path d="M82 150 L118 150 L118 182 L82 182 Z" fill="#1f6fb0" />
        <path d="M36 182 Q42 148 72 144 Q80 150 86 150 L100 178 L114 150 Q120 150 128 144 Q158 148 164 182 Z" fill={HOODIE} />
        <g stroke="#6cc0ee" strokeWidth="1.1" fill="none" opacity="0.85">
          <path d="M100 156 L100 174 M94 162 L106 162 M97 170 L103 170" />
          <circle cx="100" cy="160" r="1.4" fill="#6cc0ee" stroke="none" />
        </g>
        {/* drawstrings: out of an eyelet on each side of the V, hanging symmetrically */}
        <circle cx="85" cy="152" r="1.6" fill="#e9eef2" opacity="0.5" />
        <circle cx="115" cy="152" r="1.6" fill="#e9eef2" opacity="0.5" />
        <path d="M85 153 L81 173 M115 153 L119 173" stroke="#e9eef2" strokeWidth="1.8" strokeLinecap="round" fill="none" />

        {/* head + cheeks */}
        <path d="M100 55 C121 55 136 71 136 93 C136 112 123 129 107 134 C104 135.5 96 135.5 93 134 C77 129 64 112 64 93 C64 71 79 55 100 55 Z" fill={SKIN} />
        <ellipse cx="77" cy="116" rx="8" ry="4.5" fill="#e08a6a" opacity="0.35" />
        <ellipse cx="123" cy="116" rx="8" ry="4.5" fill="#e08a6a" opacity="0.35" />

        {/* hair escaping at the temples (the beanie cuff covers its top) */}
        <path d="M65 64 C61 78 62 92 67 103 C70 95 69 85 72 79 C74 87 73 97 76 103 C78 89 76 74 74 66 Z" fill={HAIR} />
        <path d="M135 64 C139 78 138 92 133 103 C130 95 131 85 128 79 C126 87 127 97 124 103 C122 89 124 74 126 66 Z" fill={HAIR} />

        {/* headphone band: rises from each cup and tucks under the beanie cuff */}
        <g stroke="#20242b" strokeWidth="6" strokeLinecap="round" fill="none">
          <path d="M60 94 C56 84 58 74 65 68" />
          <path d="M140 94 C144 84 142 74 135 68" />
        </g>

        {/* beanie: slouchy knit dome + folded cuff with rib ticks */}
        <path d="M70 70 C60 14 150 20 130 70 Z" fill="#d95c43" />
        <path d="M64 60 Q100 70 136 60 L136 72 Q100 82 64 72 Z" fill="#c04d38" />
        <g stroke="#a53c29" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" fill="none">
          <path d="M72 63 L72 71 M80 65.5 L80 73.5 M88 67 L88 75 M96 68 L96 76 M104 68 L104 76 M112 67 L112 75 M120 65.5 L120 73.5 M128 63 L128 71" />
        </g>

        {/* brows */}
        <g stroke={HAIR} strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M71 82 Q80 78 90 82" />
          <path d="M110 82 Q120 78 129 82" />
        </g>

        {/* round glasses, drawn over the brows */}
        <g stroke="#1a1a1a" strokeWidth="3" fill="none">
          <path d="M95 96 Q100 93 105 96" />
          <path d="M69 94 L64 92" />
          <path d="M131 94 L136 92" />
        </g>
        <circle cx="82" cy="96" r="13" fill="#fbf7ef" stroke="#1a1a1a" strokeWidth="3" />
        <circle cx="118" cy="96" r="13" fill="#fbf7ef" stroke="#1a1a1a" strokeWidth="3" />

        {/* LEFT EYE: ball -> pupil(.rra-pupil, data-base-*) -> lid(.rra-lid, skin-colored, on top) */}
        <g>
          <ellipse cx="82" cy="97" rx="8" ry="8.5" fill="#ffffff" />
          <circle className="rra-pupil" data-base-x={82} data-base-y={97} cx="82" cy="97" r="4.6" fill="#2b1b12" />
          <circle cx="84" cy="94" r="1.5" fill="#ffffff" />
          <rect className="rra-lid" data-max-height="18" x="73" y="87" width="18" height="0" fill={SKIN} />
        </g>
        {/* RIGHT EYE */}
        <g>
          <ellipse cx="118" cy="97" rx="8" ry="8.5" fill="#ffffff" />
          <circle className="rra-pupil" data-base-x={118} data-base-y={97} cx="118" cy="97" r="4.6" fill="#2b1b12" />
          <circle cx="120" cy="94" r="1.5" fill="#ffffff" />
          <rect className="rra-lid" data-max-height="18" x="109" y="87" width="18" height="0" fill={SKIN} />
        </g>

        {/* nose */}
        <path d="M99 105 C97 111 95 114 97 115.4 C98.6 116.6 101.4 116.6 103 115.4" fill="none" stroke={SKIN_SHADOW} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

        {/* freckles */}
        <g fill={SKIN_SHADOW} opacity="0.6">
          <circle cx="77" cy="114" r="1" /><circle cx="72" cy="117" r="0.9" /><circle cx="82" cy="117" r="0.8" />
          <circle cx="123" cy="114" r="1" /><circle cx="128" cy="117" r="0.9" /><circle cx="118" cy="117" r="0.8" />
        </g>

        {/* mouth: thin ellipse, resting ry=2.3 — the runtime opens it from here */}
        <ellipse id="rra-mouth" cx="100" cy="121" rx="7" ry="2.3" fill="#8c4a3f" />
        <path d="M95 126 Q100 129 105 126" fill="none" stroke={SKIN_SHADOW} strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />

        {/* over-ear headphone cups */}
        <rect x="52" y="90" width="16" height="26" rx="8" fill="#20242b" />
        <rect x="55" y="94" width="10" height="18" rx="5" fill="#3c424b" />
        <rect x="132" y="90" width="16" height="26" rx="8" fill="#20242b" />
        <rect x="135" y="94" width="10" height="18" rx="5" fill="#3c424b" />
      </g>

      {/* thought bubble: OUTSIDE the clip so it floats past the disc */}
      <g id="rra-think" opacity="0">
        <circle cx="150" cy="54" r="4" fill="#ffffff" stroke="#8b5cf6" strokeWidth="2" />
        <circle cx="165" cy="42" r="5.5" fill="#ffffff" stroke="#8b5cf6" strokeWidth="2" />
        <circle cx="182" cy="28" r="7" fill="#ffffff" stroke="#8b5cf6" strokeWidth="2.5" />
      </g>
    </svg>
  );
}

export default function CharacterAvatarDeveloper() {
  return (
    <RealtimeAvatar state="speaking" variant="byos">
      <CoderAvatar />
    </RealtimeAvatar>
  );
}
