/**
 * 08 · A full character avatar (`variant="byos"`).
 *
 * Where example 06 shows the *minimum* SVG that satisfies the contract, this one
 * shows what a polished, branded character looks like: a red-squirrel developer
 * (tufted ears, bushy tail, round glasses, brown quiff, hoodie + circuit tee, a
 * neck bridging head and body). It's still just an SVG implementing the same
 * `#rra-*` hooks — the runtime gives it blink, gaze, audio/text mouth and the
 * thinking bubble for free. Your design, your license (this one is MIT, own art).
 *
 * The only "special" parts are the contract hooks; everything else is plain flat
 * vector you draw freely. The eyes show the canonical three-layer build, in paint
 * order: eyeball → `.rra-pupil` (with data-base-*) → `.rra-lid` (a skin/fur-colored
 * rect, height 0 = open, painted on top so a blink reads as the face coming down).
 *
 *   #rra-ring    state ring    -> stroke = stateColors[state]
 *   #rra-mouth   mouth (ellipse, resting ry=2.3) -> ry/rx grow open
 *   .rra-pupil   pupils (x2)   -> cx/cy ease toward gaze / thinking look-up
 *   .rra-lid     eyelids (x2)  -> height (blink; 0 = open), data-max-height to close
 *   #rra-think   thought bubble-> opacity + dots pulse while `thinking`
 *
 * Run: npm install react-ai-avatar motion
 */
import { RealtimeAvatar } from 'react-ai-avatar';
import 'react-ai-avatar/style.css';

/** The fur color is reused for BOTH eyelids — recolor it and blinks stay correct. */
const FUR = '#cf6b34';

function SquirrelAvatar() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Squirrel avatar">
      <circle id="rra-ring" cx="100" cy="100" r="92" fill="none" stroke="#4b5563" strokeWidth="5" />
      <circle cx="100" cy="100" r="79" fill="#6fb3bd" />
      <clipPath id="sqclip"><circle cx="100" cy="100" r="79" /></clipPath>
      <g clipPath="url(#sqclip)">
        {/* bushy tail (back-most prop) */}
        <path d="M150 158 C182 150 188 96 162 66 C150 52 130 52 124 66 C140 70 150 92 146 110 C142 132 132 148 150 158 Z" fill={FUR} />
        <path d="M150 150 C172 142 176 100 156 76 C150 90 156 104 152 120 C148 134 140 142 150 150 Z" fill="#e3a368" />

        {/* neck: fur from chin into the collar + a chin shadow for volume */}
        <path d="M84 118 Q82 140 78 150 L122 150 Q118 140 116 118 Z" fill={FUR} />
        <path d="M85 122 Q100 133 115 122 Q100 129 85 122 Z" fill="#b05418" opacity="0.55" />

        {/* body: hoodie + collar V + circuit tee + drawstrings */}
        <path d="M36 182 Q42 148 72 144 Q86 158 100 158 Q114 158 128 144 Q158 148 164 182 Z" fill="#2b2f36" />
        <path d="M78 146 Q100 156 122 146" fill="none" stroke="#3c424b" strokeWidth="3" strokeLinecap="round" />
        <path d="M88 152 L100 182 L112 152 Z" fill="#1f6fb0" />
        <g stroke="#6cc0ee" strokeWidth="1.1" fill="none" opacity="0.85">
          <path d="M100 158 L100 178 M94 164 L106 164 M97 172 L103 172" />
          <circle cx="100" cy="162" r="1.4" fill="#6cc0ee" stroke="none" />
        </g>
        <path d="M96 150 L94 170 M104 150 L106 170" stroke="#e9eef2" strokeWidth="1.6" strokeLinecap="round" fill="none" />

        {/* tufted squirrel ears */}
        <path d="M66 80 L58 42 Q74 50 86 72 Z" fill={FUR} />
        <path d="M134 80 L142 42 Q126 50 114 72 Z" fill={FUR} />
        <path d="M68 74 L63 52 Q72 56 80 70 Z" fill="#a8451c" />
        <path d="M132 74 L137 52 Q128 56 120 70 Z" fill="#a8451c" />
        <g stroke="#f0d9b8" strokeWidth="1.4" strokeLinecap="round" fill="none">
          <path d="M60 46 L57 38 M63 47 L62 39 M66 49 L66 41" />
          <path d="M140 46 L143 38 M137 47 L138 39 M134 49 L134 41" />
        </g>

        {/* head + cheek fluff + lighter muzzle */}
        <ellipse cx="100" cy="98" rx="40" ry="37" fill={FUR} />
        <path d="M62 96 Q54 90 58 100 Q56 108 64 106 Z" fill={FUR} />
        <path d="M138 96 Q146 90 142 100 Q144 108 136 106 Z" fill={FUR} />
        <ellipse cx="100" cy="112" rx="23" ry="18" fill="#ecc090" />

        {/* brown quiff */}
        <path d="M64 78 Q60 50 86 46 Q78 54 82 60 Q92 44 110 48 Q102 56 106 60 Q120 50 134 74 Q124 62 112 66 Q100 56 88 66 Q76 64 64 78 Z" fill="#3a2820" />

        {/* brows */}
        <g stroke="#5a3a22" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M70 80 Q78 75 88 79" />
          <path d="M112 79 Q122 75 130 80" />
        </g>

        {/* round glasses, drawn over the brows */}
        <g stroke="#1a1a1a" strokeWidth="3" fill="none">
          <path d="M95 92 Q100 89 105 92" />
          <path d="M69 90 L60 86" />
          <path d="M131 90 L140 86" />
        </g>
        <circle cx="82" cy="92" r="13.5" fill="#fbf7ef" stroke="#1a1a1a" strokeWidth="3" />
        <circle cx="118" cy="92" r="13.5" fill="#fbf7ef" stroke="#1a1a1a" strokeWidth="3" />

        {/* LEFT EYE: ball -> pupil(.rra-pupil, data-base-*) -> lid(.rra-lid, fur-colored, on top) */}
        <g>
          <ellipse cx="82" cy="93" rx="8" ry="8.5" fill="#ffffff" />
          <circle className="rra-pupil" data-base-x={82} data-base-y={93} cx="82" cy="93" r="4.6" fill="#2b1b12" />
          <circle cx="84" cy="90" r="1.5" fill="#ffffff" />
          <rect className="rra-lid" data-max-height="18" x="73" y="83" width="18" height="0" fill={FUR} />
        </g>
        {/* RIGHT EYE */}
        <g>
          <ellipse cx="118" cy="93" rx="8" ry="8.5" fill="#ffffff" />
          <circle className="rra-pupil" data-base-x={118} data-base-y={93} cx="118" cy="93" r="4.6" fill="#2b1b12" />
          <circle cx="120" cy="90" r="1.5" fill="#ffffff" />
          <rect className="rra-lid" data-max-height="18" x="109" y="83" width="18" height="0" fill={FUR} />
        </g>

        {/* nose */}
        <path d="M93 107 Q100 101 107 107 Q100 113 93 107 Z" fill="#7a4a32" />
        <path d="M100 113 L100 118" stroke="#7a4a32" strokeWidth="1.6" strokeLinecap="round" />

        {/* mouth: thin ellipse, resting ry=2.3 — the runtime opens it from here */}
        <ellipse id="rra-mouth" cx="100" cy="121" rx="7" ry="2.3" fill="#5a3324" />

        {/* whiskers */}
        <g stroke="#caa074" strokeWidth="1" strokeLinecap="round" opacity="0.8" fill="none">
          <path d="M80 116 L62 113 M80 120 L62 121 M120 116 L138 113 M120 120 L138 121" />
        </g>
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

export default function CharacterAvatarSquirrel() {
  return (
    <RealtimeAvatar state="speaking" variant="byos">
      <SquirrelAvatar />
    </RealtimeAvatar>
  );
}
