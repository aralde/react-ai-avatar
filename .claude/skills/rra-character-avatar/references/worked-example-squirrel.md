# Worked example — the "deluxe squirrel" avatar

A complete, contract-compliant character: a red-squirrel developer (orange fur,
tufted ears, bushy tail, round glasses, brown quiff, hoodie + circuit tee, neck
bridging head and body). Use it as a structural template — swap the character, keep
the wiring.

Note how the contract hooks are the *only* special parts; everything else is plain
flat-vector decoration. The eyes show the canonical three-layer build:
`eyeball → .rra-pupil (with data-base-*) → .rra-lid (rect, height 0, skin-colored)`,
in that paint order.

## 1. The SVG (drop into a component or the preview harness)

```svg
<svg viewBox="0 0 200 200" width="320" height="320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar ardilla">
  <circle id="rra-ring" cx="100" cy="100" r="92" fill="none" stroke="#4b5563" stroke-width="5"/>
  <circle cx="100" cy="100" r="79" fill="#6fb3bd"/>
  <clipPath id="sqclip"><circle cx="100" cy="100" r="79"/></clipPath>
  <g clip-path="url(#sqclip)">

    <!-- bushy tail (back-most prop) -->
    <path d="M150 158 C182 150 188 96 162 66 C150 52 130 52 124 66 C140 70 150 92 146 110 C142 132 132 148 150 158 Z" fill="#cf6b34"/>
    <path d="M150 150 C172 142 176 100 156 76 C150 90 156 104 152 120 C148 134 140 142 150 150 Z" fill="#e3a368"/>

    <!-- neck: fur from chin into the collar, with a chin shadow for volume -->
    <path d="M84 118 Q82 140 78 150 L122 150 Q118 140 116 118 Z" fill="#cf6b34"/>
    <path d="M85 122 Q100 133 115 122 Q100 129 85 122 Z" fill="#b05418" opacity="0.55"/>

    <!-- body: hoodie + collar V + circuit tee + drawstrings -->
    <path d="M36 182 Q42 148 72 144 Q86 158 100 158 Q114 158 128 144 Q158 148 164 182 Z" fill="#2b2f36"/>
    <path d="M78 146 Q100 156 122 146" fill="none" stroke="#3c424b" stroke-width="3" stroke-linecap="round"/>
    <path d="M88 152 L100 182 L112 152 Z" fill="#1f6fb0"/>
    <g stroke="#6cc0ee" stroke-width="1.1" fill="none" opacity="0.85">
      <path d="M100 158 L100 178 M94 164 L106 164 M97 172 L103 172"/>
      <circle cx="100" cy="162" r="1.4" fill="#6cc0ee" stroke="none"/>
    </g>
    <path d="M96 150 L94 170 M104 150 L106 170" stroke="#e9eef2" stroke-width="1.6" stroke-linecap="round" fill="none"/>

    <!-- tufted squirrel ears -->
    <path d="M66 80 L58 42 Q74 50 86 72 Z" fill="#cf6b34"/>
    <path d="M134 80 L142 42 Q126 50 114 72 Z" fill="#cf6b34"/>
    <path d="M68 74 L63 52 Q72 56 80 70 Z" fill="#a8451c"/>
    <path d="M132 74 L137 52 Q128 56 120 70 Z" fill="#a8451c"/>
    <g stroke="#f0d9b8" stroke-width="1.4" stroke-linecap="round" fill="none">
      <path d="M60 46 L57 38 M63 47 L62 39 M66 49 L66 41"/>
      <path d="M140 46 L143 38 M137 47 L138 39 M134 49 L134 41"/>
    </g>

    <!-- head + cheek fluff + lighter muzzle -->
    <ellipse cx="100" cy="98" rx="40" ry="37" fill="#cf6b34"/>
    <path d="M62 96 Q54 90 58 100 Q56 108 64 106 Z" fill="#cf6b34"/>
    <path d="M138 96 Q146 90 142 100 Q144 108 136 106 Z" fill="#cf6b34"/>
    <ellipse cx="100" cy="112" rx="23" ry="18" fill="#ecc090"/>

    <!-- brown quiff -->
    <g fill="#3a2820">
      <path d="M64 78 Q60 50 86 46 Q78 54 82 60 Q92 44 110 48 Q102 56 106 60 Q120 50 134 74 Q124 62 112 66 Q100 56 88 66 Q76 64 64 78 Z"/>
    </g>

    <!-- brows -->
    <g stroke="#5a3a22" stroke-width="3" stroke-linecap="round" fill="none">
      <path d="M70 80 Q78 75 88 79"/>
      <path d="M112 79 Q122 75 130 80"/>
    </g>

    <!-- round glasses (drawn over the brows, under nothing) -->
    <g stroke="#1a1a1a" stroke-width="3" fill="none">
      <path d="M95 92 Q100 89 105 92"/>
      <path d="M69 90 L60 86"/>
      <path d="M131 90 L140 86"/>
    </g>
    <circle cx="82" cy="92" r="13.5" fill="#fbf7ef" stroke="#1a1a1a" stroke-width="3"/>
    <circle cx="118" cy="92" r="13.5" fill="#fbf7ef" stroke="#1a1a1a" stroke-width="3"/>

    <!-- LEFT EYE: ball -> pupil(.rra-pupil, data-base-*) -> lid(.rra-lid, fur-colored, on top) -->
    <g id="rra-eyeL">
      <ellipse cx="82" cy="93" rx="8" ry="8.5" fill="#ffffff"/>
      <circle class="rra-pupil" data-base-x="82" data-base-y="93" cx="82" cy="93" r="4.6" fill="#2b1b12"/>
      <circle cx="84" cy="90" r="1.5" fill="#ffffff"/>
      <rect class="rra-lid" data-max-height="18" x="73" y="83" width="18" height="0" fill="#cf6b34"/>
    </g>
    <!-- RIGHT EYE -->
    <g id="rra-eyeR">
      <ellipse cx="118" cy="93" rx="8" ry="8.5" fill="#ffffff"/>
      <circle class="rra-pupil" data-base-x="118" data-base-y="93" cx="118" cy="93" r="4.6" fill="#2b1b12"/>
      <circle cx="120" cy="90" r="1.5" fill="#ffffff"/>
      <rect class="rra-lid" data-max-height="18" x="109" y="83" width="18" height="0" fill="#cf6b34"/>
    </g>

    <!-- nose -->
    <path d="M93 107 Q100 101 107 107 Q100 113 93 107 Z" fill="#7a4a32"/>
    <path d="M100 113 L100 118" stroke="#7a4a32" stroke-width="1.6" stroke-linecap="round"/>

    <!-- MOUTH: thin ellipse, resting ry=2.3 (the runtime opens it from here) -->
    <ellipse id="rra-mouth" cx="100" cy="121" rx="7" ry="2.3" fill="#5a3324"/>

    <!-- whiskers -->
    <g stroke="#caa074" stroke-width="1" stroke-linecap="round" opacity="0.8" fill="none">
      <path d="M80 116 L62 113 M80 120 L62 121 M120 116 L138 113 M120 120 L138 121"/>
    </g>
  </g>

  <!-- thought bubble: OUTSIDE the clip so it floats past the disc -->
  <g id="rra-think" opacity="0">
    <circle cx="150" cy="54" r="4" fill="#ffffff" stroke="#8b5cf6" stroke-width="2"/>
    <circle cx="165" cy="42" r="5.5" fill="#ffffff" stroke="#8b5cf6" stroke-width="2"/>
    <circle cx="182" cy="28" r="7" fill="#ffffff" stroke="#8b5cf6" stroke-width="2.5"/>
  </g>
</svg>
```

## 2. As a reusable preset component (`SquirrelAvatar.tsx`)

Mirrors the built-in `DoodleAvatar` shape: takes `size` + `customization`, returns
the `<svg>`. This is the form that can join the library's own catalog.

```tsx
import React from 'react';
import { AvatarCustomization } from './DefaultAvatar';

export interface SquirrelAvatarProps {
  size?: number;
  customization?: Partial<AvatarCustomization>;
  ringColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * SquirrelAvatar — red-squirrel developer, own design (MIT, no third-party assets).
 * Implements the #rra-* layer contract; the runtime drives blink/gaze/mouth/ring.
 */
export function SquirrelAvatar({
  size = 300,
  customization,
  ringColor = '#4b5563',
  className,
  style,
}: SquirrelAvatarProps) {
  const {
    skinColor = '#cf6b34',  // fur — also used for the eyelids
    bgColor = '#6fb3bd',
  } = customization ?? {};

  return (
    <svg viewBox="0 0 200 200" width={size} height={size}
         xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar"
         className={className} style={style}>
      {/* paste the SVG body from section 1, replacing:
          - #rra-ring stroke   -> {ringColor}
          - the r=79 bg circle -> fill={bgColor}
          - fur fills #cf6b34  -> {skinColor} (including BOTH .rra-lid fills) */}
    </svg>
  );
}
```

Wire it up either way:

```tsx
// A. bring-your-own-SVG
<RealtimeAvatar state={state} analyser={analyser} variant="byos">
  <SquirrelAvatar size={300} />
</RealtimeAvatar>

// B. directly through the contract wrapper
<ContractAvatar state={state} analyser={analyser} size={300}>
  <SquirrelAvatar size={300} />
</ContractAvatar>
```

## 3. Customization seams worth exposing

- `skinColor` must also recolor **both `.rra-lid` rects** — otherwise a recolored
  squirrel blinks with the wrong-colored lids.
- `ringColor` is only the pre-mount value of `#rra-ring`; at runtime the library's
  `stateColors` win. Keep it as a static fallback for when the avatar is shown
  outside `ContractAvatar` (e.g. a catalog thumbnail).
- For a pixel-art squirrel, follow `references/contract-reference.md` → make the
  mouth and pupils `<rect>`s with `data-quantize`.
