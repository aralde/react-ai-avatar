import React from 'react';
import type { AvatarCustomization } from './DefaultAvatar';

/**
 * SquirrelAvatar — a full branded character (red-squirrel developer) drawn as a
 * flat-vector face: tufted ears, bushy tail, round glasses, brown quiff, hoodie +
 * circuit tee, and a neck bridging head and body. Own design (MIT, no third-party
 * assets).
 *
 * It implements the layer contract (see useAvatarRuntime) exactly like the built-in
 * presets, so the runtime drives blink / gaze / mouth for free. No state ring —
 * matches the other presets, which dropped theirs. The fur color is reused for BOTH
 * eyelids on purpose — recolor it and a blink still reads as the face coming down
 * over the eye.
 *
 * In the demo it's rendered through `variant="byos"`; it's also the worked example
 * behind the `rra-character-avatar` skill.
 */

import type { AvatarState } from '../lib/types';

export interface SquirrelAvatarProps {
  /** SVG width/height. Defaults to `'100%'` so the squirrel fills its (sized)
   *  container — e.g. the box `ContractAvatar`/`RealtimeAvatar` already reserves.
   *  Pass a number for a fixed pixel size. */
  size?: number | string;
  customization?: Partial<AvatarCustomization>;
  state?: AvatarState;
  className?: string;
  style?: React.CSSProperties;
}

export function SquirrelAvatar({
  size = '100%',
  customization,
  state,
  className,
  style,
}: SquirrelAvatarProps) {
  const {
    skinColor: fur = '#cf6b34', // fur — also used for the eyelids
    bgColor = '#6fb3bd',
  } = customization ?? {};

  const [workingVariant, setWorkingVariant] = React.useState<'wires' | 'paper'>(() =>
    Math.random() < 0.5 ? 'wires' : 'paper'
  );
  const lastStateRef = React.useRef(state);

  React.useEffect(() => {
    if (state === 'working' && lastStateRef.current !== 'working') {
      setWorkingVariant(Math.random() < 0.5 ? 'wires' : 'paper');
    }
    lastStateRef.current = state;
  }, [state]);

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Avatar"
      className={className}
      style={style}
    >
      <circle cx="100" cy="100" r="79" fill={bgColor} />
      <clipPath id="rra-squirrel-clip"><circle cx="100" cy="100" r="79" /></clipPath>
      <g clipPath="url(#rra-squirrel-clip)">
        {/* bushy tail (back-most prop) */}
        <path d="M150 158 C182 150 188 96 162 66 C150 52 130 52 124 66 C140 70 150 92 146 110 C142 132 132 148 150 158 Z" fill={fur} />
        <path d="M150 150 C172 142 176 100 156 76 C150 90 156 104 152 120 C148 134 140 142 150 150 Z" fill="#e3a368" />


        {/* neck: fur from chin into the collar + a chin shadow for volume */}
        <path d="M84 118 Q82 140 78 150 L122 150 Q118 140 116 118 Z" fill={fur} />
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

        <g id="rra-squirrel-head" transform={state === 'thinking' ? 'rotate(6 100 120)' : undefined}>
          {/* tufted squirrel ears */}
          <path d="M66 80 L58 42 Q74 50 86 72 Z" fill={fur} />
          <path d="M134 80 L142 42 Q126 50 114 72 Z" fill={fur} />
          <path d="M68 74 L63 52 Q72 56 80 70 Z" fill="#a8451c" />
          <path d="M132 74 L137 52 Q128 56 120 70 Z" fill="#a8451c" />
          <g stroke="#f0d9b8" strokeWidth="1.4" strokeLinecap="round" fill="none">
            <path d="M60 46 L57 38 M63 47 L62 39 M66 49 L66 41" />
            <path d="M140 46 L143 38 M137 47 L138 39 M134 49 L134 41" />
          </g>

          {/* head + cheek fluff + lighter muzzle */}
          <ellipse cx="100" cy="98" rx="40" ry="37" fill={fur} />
          <path d="M62 96 Q54 90 58 100 Q56 108 64 106 Z" fill={fur} />
          <path d="M138 96 Q146 90 142 100 Q144 108 136 106 Z" fill={fur} />
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
            <g transform={state === 'thinking' ? 'translate(5, 0)' : undefined}>
              <circle className="rra-pupil" data-base-x={82} data-base-y={93} cx="82" cy="93" r="4.6" fill="#2b1b12" />
            </g>
            <circle cx="84" cy="90" r="1.5" fill="#ffffff" />
            <rect className="rra-lid" data-max-height="18" x="73" y="83" width="18" height="0" fill={fur} />
          </g>
          {/* RIGHT EYE */}
          <g>
            <ellipse cx="118" cy="93" rx="8" ry="8.5" fill="#ffffff" />
            <g transform={state === 'thinking' ? 'translate(5, 0)' : undefined}>
              <circle className="rra-pupil" data-base-x={118} data-base-y={93} cx="118" cy="93" r="4.6" fill="#2b1b12" />
            </g>
            <circle cx="120" cy="90" r="1.5" fill="#ffffff" />
            <rect className="rra-lid" data-max-height="18" x="109" y="83" width="18" height="0" fill={fur} />
          </g>

          {state === 'working' && workingVariant === 'wires' && (
            <g id="rra-safety-goggles">
              {/* Strap/elastic band on the sides */}
              <path d="M 52 92 C 45 92, 45 96, 40 96 M 148 92 C 155 92, 155 96, 160 96" fill="none" stroke="#2d3748" strokeWidth="4" strokeLinecap="round" />
              {/* Goggles Frame (single large rounded capsule) */}
              <rect x="58" y="78" width="84" height="28" rx="14" fill="none" stroke="#e2e8f0" strokeWidth="4" />
              {/* Goggles Lens (semi-transparent light blue/white glare) */}
              <rect x="60" y="80" width="80" height="24" rx="12" fill="#e0f2fe" fillOpacity="0.15" />
              {/* Left/Right dark pivot dots */}
              <circle cx="56" cy="92" r="3" fill="#475569" />
              <circle cx="144" cy="92" r="3" fill="#475569" />
            </g>
          )}

          {/* nose */}
          <path d="M93 107 Q100 101 107 107 Q100 113 93 107 Z" fill="#7a4a32" />
          <path d="M100 113 L100 118" stroke="#7a4a32" strokeWidth="1.6" strokeLinecap="round" />

          {/* mouth: thin ellipse, resting ry=2.3 — the runtime opens it from here */}
          <ellipse id="rra-mouth" cx="100" cy="121" rx="7" ry="2.3" fill="#5a3324" />

          {/* whiskers */}
          <g stroke="#caa074" strokeWidth="1" strokeLinecap="round" opacity="0.8" fill="none">
            <path d="M80 116 L62 113 M80 120 L62 121 M120 116 L138 113 M120 120 L138 121" />
          </g>

          {/* hand touching the chin, rendered only when thinking */}
          {state === 'thinking' && (
            <g id="rra-thinking-hand">
              {/* Sleeve coming up from the bottom right to the chin */}
              <path
                d="M136 182 L112 144 L124 138 L152 182 Z"
                fill="#2b2f36"
                stroke="#1e293b"
                strokeWidth="1.2"
              />
              {/* Hand with index finger touching chin, thumb pointing left */}
              <g fill={fur} stroke="#b05418" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round">
                {/* Index finger pointing up-left, touching the chin/cheek */}
                <path d="M112 144 C110 138, 107 130, 105 124 C104 121, 108 121, 109 124 C111 130, 113 136, 115 141" />
                {/* Curled fingers (middle, ring, pinky) */}
                <path d="M115 141 C117 139, 120 140, 119 143 C121 142, 123 144, 121 147 C122 147, 123 149, 121 151 C120 152, 116 150, 115 145" />
                {/* Thumb pointing left under the chin */}
                <path d="M110 139 C104 139, 96 135, 92 132 C90 130, 93 128, 95 130 C100 133, 106 135, 110 136" />
              </g>
            </g>
          )}
        </g>

        {state === 'working' && workingVariant === 'wires' && (
          <g id="rra-working-workspace-wires">
            {/* Light bulb radial glow (flickering) */}
            <circle cx="100" cy="162" r="22" fill="#fef08a" fillOpacity="0.25">
              <animate attributeName="opacity" values="1;0.2;0.9;0.1;0.8;0.3;1" dur="1.2s" repeatCount="indefinite" />
            </circle>
            {/* Bulb base socket */}
            <rect x="94" y="172" width="12" height="8" fill="#94a3b8" rx="1" />
            <rect x="96" y="175" width="8" height="2" fill="#64748b" />
            {/* Bulb glass dome (flickering fill) */}
            <path d="M92 165 C92 153, 108 153, 108 165 C108 171, 104 172, 104 174 L96 174 C96 172, 92 171, 92 165 Z" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5">
              <animate attributeName="fill" values="#fef08a;#fef08a;#78350f;#fef08a;#fef08a;#78350f;#fef08a" dur="1.2s" repeatCount="indefinite" />
            </path>
            {/* Filament (flickering stroke) */}
            <path d="M97 167 L99 160 L101 160 L103 167" fill="none" stroke="#ca8a04" strokeWidth="1">
              <animate attributeName="stroke" values="#ca8a04;#ca8a04;#78350f;#ca8a04;#ca8a04;#78350f;#ca8a04" dur="1.2s" repeatCount="indefinite" />
            </path>

            {/* Left Arm & Cable shaking system */}
            <g id="rra-left-arm-cable">
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; -0.6,0.3; 0.4,-0.2; -0.3,-0.5; 0,0"
                dur="0.18s"
                repeatCount="indefinite"
              />
              {/* Sleeves (Grey hoodie color #2b2f36) */}
              <path d="M36 182 L55 162 L64 168 L45 182 Z" fill="#2b2f36" stroke="#1e293b" strokeWidth="1" />
              {/* Wires */}
              <path d="M 45 180 C 45 165, 80 170, 94 174" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
              {/* Paws / fingers wrapping the wires */}
              <g fill={fur} stroke="#b05418" strokeWidth="1">
                <rect x="58" y="160" width="10" height="12" rx="4" transform="rotate(-10 63 166)" />
                <rect x="62" y="163" width="9" height="10" rx="3" transform="rotate(-15 66.5 168)" />
              </g>
            </g>

            {/* Right Arm & Cable shaking system */}
            <g id="rra-right-arm-cable">
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; 0.5,-0.3; -0.4,0.2; 0.3,0.4; 0,0"
                dur="0.15s"
                repeatCount="indefinite"
              />
              {/* Sleeves (Grey hoodie color #2b2f36) */}
              <path d="M164 182 L145 162 L136 168 L155 182 Z" fill="#2b2f36" stroke="#1e293b" strokeWidth="1" />
              {/* Wires */}
              <path d="M 155 180 C 155 165, 120 170, 106 174" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
              {/* Paws / fingers wrapping the wires */}
              <g fill={fur} stroke="#b05418" strokeWidth="1">
                <rect x="132" y="160" width="10" height="12" rx="4" transform="rotate(10 137 166)" />
                <rect x="129" y="163" width="9" height="10" rx="3" transform="rotate(15 133.5 168)" />
              </g>
            </g>
          </g>
        )}

        {state === 'working' && workingVariant === 'paper' && (
          <g id="rra-working-workspace-paper">
            {/* Whole open book + hands gently breathe while reading */}
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0; 0,1; 0,0; 0,1; 0,0"
              dur="3.2s"
              repeatCount="indefinite"
            />

            {/* Sleeves coming up from the hoodie to grip the lower-outer book corners */}
            <path d="M36 182 L54 168 L64 176 L48 182 Z" fill="#2b2f36" stroke="#1e293b" strokeWidth="1" />
            <path d="M164 182 L146 168 L136 176 L152 182 Z" fill="#2b2f36" stroke="#1e293b" strokeWidth="1" />

            {/* White page block BEHIND the covers — only its top edge peeks out above the
                black covers (the canto/edge of the stacked sheets). Valley (∨) at center. */}
            <path d="M50 118 C 66 120 84 128 100 134 C 116 128 134 120 150 118 L 148 124 C 134 126 116 134 100 150 C 84 134 66 126 52 124 Z" fill="#f8fafc" stroke="#d9d2c4" strokeWidth="1" />
            {/* A couple of page-edge lines on the visible white strip (slope follows the ∨) */}
            <g stroke="#9aa4b2" strokeWidth="1.1" strokeLinecap="round">
              <line x1="60" y1="124" x2="92" y2="137" />
              <line x1="140" y1="124" x2="108" y2="137" />
            </g>

            {/* BLACK book covers (the outside, facing us while the squirrel reads the inside).
                Diagonals inverted vs. before: gutter dips at the center, covers rise to the
                upper-outer corners, drooping to the lower-outer corners held by the paws. */}
            <path d="M100 148 C 84 136 68 130 52 126 L 60 182 C 78 178 90 177 100 176 Z" fill="#20242b" stroke="#0f1216" strokeWidth="1.5" />
            <path d="M100 148 C 116 136 132 130 148 126 L 140 182 C 122 178 110 177 100 176 Z" fill="#20242b" stroke="#0f1216" strokeWidth="1.5" />
            {/* Center fold / spine running down from the gutter */}
            <line x1="100" y1="134" x2="100" y2="176" stroke="#0f1216" strokeWidth="1.4" />

            {/* Left paw gripping the lower-outer corner, fingers curling over the page */}
            <g fill={fur} stroke="#b05418" strokeWidth="1">
              <circle cx="60" cy="180" r="7" />
              <rect x="57" y="170" width="7" height="12" rx="3" />
              <rect x="62" y="172" width="7" height="11" rx="3" />
              <rect x="67" y="173" width="6" height="10" rx="3" />
            </g>
            {/* Right paw gripping the lower-outer corner */}
            <g fill={fur} stroke="#b05418" strokeWidth="1">
              <circle cx="140" cy="180" r="7" />
              <rect x="136" y="170" width="7" height="12" rx="3" />
              <rect x="131" y="172" width="7" height="11" rx="3" />
              <rect x="127" y="173" width="6" height="10" rx="3" />
            </g>
          </g>
        )}
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
