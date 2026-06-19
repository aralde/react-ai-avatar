import React from 'react';
import { AvatarCustomization } from './DefaultAvatar';

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

import { AvatarState } from '../lib/types';

export interface SquirrelAvatarProps {
  size?: number;
  customization?: Partial<AvatarCustomization>;
  state?: AvatarState;
  className?: string;
  style?: React.CSSProperties;
}

export function SquirrelAvatar({
  size = 300,
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
          <circle className="rra-pupil" data-base-x={82} data-base-y={93} cx="82" cy="93" r="4.6" fill="#2b1b12" />
          <circle cx="84" cy="90" r="1.5" fill="#ffffff" />
          <rect className="rra-lid" data-max-height="18" x="73" y="83" width="18" height="0" fill={fur} />
        </g>
        {/* RIGHT EYE */}
        <g>
          <ellipse cx="118" cy="93" rx="8" ry="8.5" fill="#ffffff" />
          <circle className="rra-pupil" data-base-x={118} data-base-y={93} cx="118" cy="93" r="4.6" fill="#2b1b12" />
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
            {/* Folder backing & paper & holding hand (grouped and rotated together for perfect alignment) */}
            <g id="rra-clipboard-folder" transform="rotate(-12 145 140)">
              {/* Folder backing (slanted/open style folder with rounded corners and folding perspective) */}
              <path d="M 122 95 L 151 95 Q 154 95, 156 97 L 168 109 Q 170 111, 170 114 L 170 146 Q 170 149, 168 151 L 156 163 Q 154 165, 151 165 L 122 165 Q 120 165, 120 163 L 120 97 Q 120 95, 122 95 Z" fill="#f0e6d2" stroke="#c8bfae" strokeWidth="1.5" />
              {/* Crease line separating pages */}
              <line x1="153" y1="95" x2="153" y2="165" stroke="#d5cabb" strokeWidth="1" />
              {/* White paper sheet on the left page */}
              <rect x="122" y="99" width="29" height="60" rx="1" fill="#f8fafc" />
              {/* Text lines representing code/text */}
              <g stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round">
                <line x1="127" y1="107" x2="148" y2="107" />
                <line x1="127" y1="113" x2="145" y2="113" />
                <line x1="127" y1="119" x2="148" y2="119" />
                <line x1="127" y1="125" x2="142" y2="125" />
                <line x1="127" y1="131" x2="147" y2="131" />
                <line x1="127" y1="137" x2="144" y2="137" />
                <line x1="127" y1="143" x2="139" y2="143" />
              </g>

              {/* Right arm/hand holding the folder (rotated together with the folder) */}
              <g id="rra-holding-arm">
                <path d="M160 182 L150 152 L144 156 L153 182 Z" fill="#2b2f36" stroke="#1e293b" strokeWidth="1" />
                <g fill={fur} stroke="#b05418" strokeWidth="1">
                  <rect x="146" y="158" width="7" height="10" rx="3" transform="rotate(20 149 163)" />
                  <rect x="152" y="160" width="7" height="10" rx="3" transform="rotate(20 155 165)" />
                  <rect x="158" y="161" width="6" height="9" rx="2.5" transform="rotate(20 161 165)" />
                </g>
              </g>
            </g>

            {/* Left arm/hand pointing/scanning (outside rotated group so it can animate independently) */}
            <g id="rra-pointing-paw">
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; 2,-1.5; -1,1; 1.5,-0.5; 0,0"
                dur="2.5s"
                repeatCount="indefinite"
              />
              {/* Sleeve */}
              <path d="M36 182 L100 144 L106 152 L45 182 Z" fill="#2b2f36" stroke="#1e293b" strokeWidth="1" />
              {/* Palm/Fist */}
              <circle cx="104" cy="149" r="6.5" fill={fur} stroke="#b05418" strokeWidth="1" />
              {/* Pointing index finger */}
              <path d="M104 145 L121 137 C123.5 135.5, 125 138, 122 140 L106 149 Z" fill={fur} stroke="#b05418" strokeWidth="1" />
              {/* Folded fingers */}
              <circle cx="102" cy="151" r="2.5" fill={fur} stroke="#b05418" strokeWidth="1" />
              <circle cx="105" cy="153" r="2.5" fill={fur} stroke="#b05418" strokeWidth="1" />
              <circle cx="108" cy="151" r="2.5" fill={fur} stroke="#b05418" strokeWidth="1" />
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
