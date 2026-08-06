import React from 'react';
import { darkenColor, type AvatarCustomization } from './DefaultAvatar';

/**
 * CoderAvatar — a full branded character (young developer) drawn as a flat-vector
 * face: slouchy knit beanie, over-ear headphones, round glasses, hair escaping at
 * the temples, hoodie + circuit tee, and a neck bridging head and body. Own design
 * (MIT, no third-party assets). Sibling of `SquirrelAvatar`, same construction.
 *
 * It implements the layer contract (see useAvatarRuntime) exactly like the built-in
 * presets, so the runtime drives blink / gaze / mouth for free. No state ring —
 * matches the other presets, which dropped theirs. The skin color is reused for BOTH
 * eyelids on purpose — recolor it and a blink still reads as the face coming down
 * over the eye; the shading tones are derived from it so they follow along.
 *
 * The beanie is deliberately NOT customizable: `AvatarCustomization` has no field
 * for it, and the coral against the teal backdrop is what makes the character
 * readable at 48px.
 *
 * In the demo it's rendered through `variant="byos"`.
 */

import type { AvatarState } from '../lib/types';

export interface CoderAvatarProps {
  /** SVG width/height. Defaults to `'100%'` so the character fills its (sized)
   *  container — e.g. the box `ContractAvatar`/`RealtimeAvatar` already reserves.
   *  Pass a number for a fixed pixel size. */
  size?: number | string;
  customization?: Partial<AvatarCustomization>;
  state?: AvatarState;
  /**
   * Opt in to the character's per-state poses: head tilt + hand-on-chin while
   * `thinking`, and a randomly-picked "typing on a laptop" / "reading a book" scene
   * while `working`. Off by default, so the coder matches the other presets (just
   * face / blink / mouth / gaze) unless you ask for the show.
   */
  poses?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const BEANIE = '#d95c43';
const BEANIE_CUFF = '#c04d38';
const BEANIE_RIB = '#a53c29';
const HEADPHONE = '#20242b';
const HEADPHONE_PAD = '#3c424b';

export function CoderAvatar({
  size = '100%',
  customization,
  state,
  poses = false,
  className,
  style,
}: CoderAvatarProps) {
  const {
    skinColor: skin = '#e8b083', // skin — also used for the eyelids and hands
    hairColor: hair = '#3a2820',
    hoodieColor: hoodie = '#2b2f36',
    clothingColor: tee = '#1f6fb0',
    glassesColor: frame = '#1a1a1a',
    bgColor = '#6fb3bd',
  } = customization ?? {};

  // Shading derived from the skin so a recolor stays coherent.
  const skinShadow = darkenColor(skin, 18);
  const skinDeep = darkenColor(skin, 30);

  const [workingVariant, setWorkingVariant] = React.useState<'laptop' | 'paper'>(() =>
    Math.random() < 0.5 ? 'laptop' : 'paper'
  );
  const lastStateRef = React.useRef(state);

  React.useEffect(() => {
    if (state === 'working' && lastStateRef.current !== 'working') {
      setWorkingVariant(Math.random() < 0.5 ? 'laptop' : 'paper');
    }
    lastStateRef.current = state;
  }, [state]);

  const working = poses && state === 'working';
  const thinking = poses && state === 'thinking';

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
      <clipPath id="rra-coder-clip"><circle cx="100" cy="100" r="79" /></clipPath>
      <g clipPath="url(#rra-coder-clip)">
        {/* neck: skin from chin into the collar + a chin shadow for volume */}
        <path d="M85 118 Q83 140 80 152 L120 152 Q117 140 115 118 Z" fill={skin} />
        <path d="M85 132 Q100 145 115 132 Q100 141 85 132 Z" fill={skinDeep} opacity="0.45" />

        {/* body: hoodie + circuit tee + drawstrings.
            The tee is painted FIRST as a plain block and the hoodie goes OVER it
            with a V cut out of its neckline, so the visible V is a real hole in
            the hoodie — the two shapes can't drift out of alignment the way a
            free-floating tee triangle stacked on top of the collar could. */}
        <path d="M82 150 L118 150 L118 182 L82 182 Z" fill={tee} />
        <path
          d="M36 182 Q42 148 72 144 Q80 150 86 150 L100 178 L114 150 Q120 150 128 144 Q158 148 164 182 Z"
          fill={hoodie}
        />

        {/* circuit trace, sized to sit inside the V with a margin on every side */}
        <g stroke="#6cc0ee" strokeWidth="1.1" fill="none" opacity="0.85">
          <path d="M100 156 L100 174 M94 162 L106 162 M97 170 L103 170" />
          <circle cx="100" cy="160" r="1.4" fill="#6cc0ee" stroke="none" />
        </g>

        {/* drawstrings: they leave an eyelet on each side of the V and hang
            symmetrically over the hoodie — never crossing the neck or the tee */}
        {/* The eyelets are a translucent light, not a darkened hoodie tone: the
            default hoodie is already near-black, so a darker dot would vanish. */}
        <g>
          <circle cx="85" cy="152" r="1.6" fill="#e9eef2" opacity="0.5" />
          <circle cx="115" cy="152" r="1.6" fill="#e9eef2" opacity="0.5" />
          <path
            d="M85 153 L81 173 M115 153 L119 173"
            stroke="#e9eef2"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        <g id="rra-coder-head" transform={thinking ? 'rotate(6 100 120)' : undefined}>
          {/* head + cheeks */}
          <path d="M100 55 C121 55 136 71 136 93 C136 112 123 129 107 134 C104 135.5 96 135.5 93 134 C77 129 64 112 64 93 C64 71 79 55 100 55 Z" fill={skin} />
          <ellipse cx="77" cy="116" rx="8" ry="4.5" fill="#e08a6a" opacity="0.35" />
          <ellipse cx="123" cy="116" rx="8" ry="4.5" fill="#e08a6a" opacity="0.35" />

          {/* hair escaping at the temples (the beanie cuff covers its top) */}
          <path d="M65 64 C61 78 62 92 67 103 C70 95 69 85 72 79 C74 87 73 97 76 103 C78 89 76 74 74 66 Z" fill={hair} />
          <path d="M135 64 C139 78 138 92 133 103 C130 95 131 85 128 79 C126 87 127 97 124 103 C122 89 124 74 126 66 Z" fill={hair} />

          {/* headphone band: rises from each cup and tucks under the beanie cuff */}
          <g stroke={HEADPHONE} strokeWidth="6" strokeLinecap="round" fill="none">
            <path d="M60 94 C56 84 58 74 65 68" />
            <path d="M140 94 C144 84 142 74 135 68" />
          </g>

          {/* beanie: slouchy knit dome + folded cuff with rib ticks */}
          <path d="M70 70 C60 14 150 20 130 70 Z" fill={BEANIE} />
          <path d="M64 60 Q100 70 136 60 L136 72 Q100 82 64 72 Z" fill={BEANIE_CUFF} />
          <g stroke={BEANIE_RIB} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" fill="none">
            <path d="M72 63 L72 71 M80 65.5 L80 73.5 M88 67 L88 75 M96 68 L96 76 M104 68 L104 76 M112 67 L112 75 M120 65.5 L120 73.5 M128 63 L128 71" />
          </g>

          {/* brows */}
          <g stroke={hair} strokeWidth="3" strokeLinecap="round" fill="none">
            <path d="M71 82 Q80 78 90 82" />
            <path d="M110 82 Q120 78 129 82" />
          </g>

          {/* round glasses, drawn over the brows */}
          <g stroke={frame} strokeWidth="3" fill="none">
            <path d="M95 96 Q100 93 105 96" />
            <path d="M69 94 L64 92" />
            <path d="M131 94 L136 92" />
          </g>
          <circle cx="82" cy="96" r="13" fill="#fbf7ef" stroke={frame} strokeWidth="3" />
          <circle cx="118" cy="96" r="13" fill="#fbf7ef" stroke={frame} strokeWidth="3" />

          {/* LEFT EYE: ball -> pupil(.rra-pupil, data-base-*) -> lid(.rra-lid, skin-colored, on top) */}
          <g>
            <ellipse cx="82" cy="97" rx="8" ry="8.5" fill="#ffffff" />
            <g transform={thinking ? 'translate(5, 0)' : undefined}>
              <circle className="rra-pupil" data-base-x={82} data-base-y={97} cx="82" cy="97" r="4.6" fill="#2b1b12" />
            </g>
            <circle cx="84" cy="94" r="1.5" fill="#ffffff" />
            <rect className="rra-lid" data-max-height="18" x="73" y="87" width="18" height="0" fill={skin} />
          </g>
          {/* RIGHT EYE */}
          <g>
            <ellipse cx="118" cy="97" rx="8" ry="8.5" fill="#ffffff" />
            <g transform={thinking ? 'translate(5, 0)' : undefined}>
              <circle className="rra-pupil" data-base-x={118} data-base-y={97} cx="118" cy="97" r="4.6" fill="#2b1b12" />
            </g>
            <circle cx="120" cy="94" r="1.5" fill="#ffffff" />
            <rect className="rra-lid" data-max-height="18" x="109" y="87" width="18" height="0" fill={skin} />
          </g>

          {/* the laptop's screen reflected in the lenses, flickering */}
          {working && workingVariant === 'laptop' && (
            <g id="rra-screen-glare">
              <path d="M74 103 L88 89 L93 89 L79 103 Z" fill="#a5e8ff" opacity="0.55">
                <animate attributeName="opacity" values="0.55;0.25;0.6;0.3;0.55" dur="2.4s" repeatCount="indefinite" />
              </path>
              <path d="M110 103 L124 89 L129 89 L115 103 Z" fill="#a5e8ff" opacity="0.55">
                <animate attributeName="opacity" values="0.55;0.3;0.5;0.22;0.55" dur="2.4s" repeatCount="indefinite" />
              </path>
            </g>
          )}

          {/* nose */}
          <path d="M99 105 C97 111 95 114 97 115.4 C98.6 116.6 101.4 116.6 103 115.4" fill="none" stroke={skinShadow} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

          {/* freckles */}
          <g fill={skinShadow} opacity="0.6">
            <circle cx="77" cy="114" r="1" /><circle cx="72" cy="117" r="0.9" /><circle cx="82" cy="117" r="0.8" />
            <circle cx="123" cy="114" r="1" /><circle cx="128" cy="117" r="0.9" /><circle cx="118" cy="117" r="0.8" />
          </g>

          {/* mouth: thin ellipse, resting ry=2.3 — the runtime opens it from here */}
          <ellipse id="rra-mouth" cx="100" cy="121" rx="7" ry="2.3" fill="#8c4a3f" />
          <path d="M95 126 Q100 129 105 126" fill="none" stroke={skinShadow} strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />

          {/* over-ear headphone cups */}
          <rect x="52" y="90" width="16" height="26" rx="8" fill={HEADPHONE} />
          <rect x="55" y="94" width="10" height="18" rx="5" fill={HEADPHONE_PAD} />
          <rect x="132" y="90" width="16" height="26" rx="8" fill={HEADPHONE} />
          <rect x="135" y="94" width="10" height="18" rx="5" fill={HEADPHONE_PAD} />

          {/* hand touching the chin, rendered only when thinking */}
          {thinking && (
            <g id="rra-thinking-hand">
              {/* Sleeve coming up from the bottom right to the wrist */}
              <path d="M133 143 L121 156 L146 182 L172 182 Z" fill={hoodie} stroke="#1e293b" strokeWidth="1.2" />
              {/* Loose fist with the index extended. ONE silhouette for the whole
                  curled mass — outlining a stack of finger-shaped rects instead
                  reads as a pile of sausages at this size. The folded fingers are
                  suggested by soft creases INSIDE that silhouette, and only the
                  thumb and the index (the two that leave the mass) get their own
                  outlined shape, drawn last so they read in front. */}
              <g fill={skin} stroke={skinShadow} strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round">
                {/* the curled fingers + back of the hand, as one rounded mass */}
                <path d="M126 142 C135 140 142.5 146 143 154.5 L143.5 165 C144 172.5 138 177 130.5 175.5 C123.5 174 119 168.5 119 161.5 L119 152 C119 147 122 143 126 142 Z" />
                {/* creases where the fingers fold over each other, angled along
                    the knuckle line so the mass reads as fingers, not a mitten */}
                <g fill="none" stroke={skinShadow} strokeWidth="1.1" opacity="0.5" strokeLinecap="round">
                  <path d="M121 153.5 C127.5 150.5 136 152 142.5 155.5" />
                  <path d="M120 161.5 C127 158.5 135.5 160 143 163.5" />
                  <path d="M122.5 169.5 C129 166.5 136.5 168 143 171" />
                </g>
                {/* thumb: a short, wide lobe wrapped onto the LEFT SIDE of the
                    mass, not a free-standing finger — at this size a slim one
                    reads as a second index, and any tapered shape that only
                    grazes the fist leaves a sliver of sleeve showing between the
                    two. Its closing edge runs down x≈119, i.e. along the fist's
                    own left edge, so the two silhouettes can't come apart. */}
                <path d="M119.3 151.8 C113.8 152.8 110.6 156.2 111 159.4 C111.4 162.6 114.6 164.4 119.3 164.6 Z" />
                {/* the web between thumb and index */}
                <path d="M118.5 152.5 C120.8 154.8 122.6 157 123.8 159" fill="none" stroke={skinShadow} strokeWidth="1.1" opacity="0.5" />
                {/* index, extended up to rest against the jaw */}
                <path d="M127 147 C123 142 118.5 136.5 115.5 132.5 C113.6 130 116.2 127.6 118.4 129.6 C120.6 131.6 125 137 129.5 143 Z" />
              </g>
            </g>
          )}
        </g>

        {working && workingVariant === 'laptop' && (
          <g id="rra-working-workspace-laptop">
            {/* Forearms coming out of the sleeves, hands hidden behind the lid.
                Each twitches on its own cadence so the typing reads as uneven. */}
            <g id="rra-left-arm-typing">
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; 0,-0.8; 0,0.4; 0,-0.5; 0,0"
                dur="0.24s"
                repeatCount="indefinite"
              />
              <path d="M30 182 L50 158 L64 167 L46 182 Z" fill={hoodie} stroke="#1e293b" strokeWidth="1" />
              <path d="M58 164 L75 154" stroke={skin} strokeWidth="9" strokeLinecap="round" fill="none" />
              <circle cx="71" cy="155" r="5" fill={skin} stroke={skinShadow} strokeWidth="1" />
            </g>
            <g id="rra-right-arm-typing">
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; 0,0.5; 0,-0.7; 0,0.3; 0,0"
                dur="0.19s"
                repeatCount="indefinite"
              />
              <path d="M170 182 L150 158 L136 167 L154 182 Z" fill={hoodie} stroke="#1e293b" strokeWidth="1" />
              <path d="M142 164 L125 154" stroke={skin} strokeWidth="9" strokeLinecap="round" fill="none" />
              <circle cx="129" cy="155" r="5" fill={skin} stroke={skinShadow} strokeWidth="1" />
            </g>
            {/* The back of the open lid, tilted away from us — sticker-covered. */}
            <path d="M60 182 L74 138 L126 138 L138 182 Z" fill="#2f3540" stroke="#171a20" strokeWidth="1.5" />
            <path d="M74 138 L126 138" stroke="#59616e" strokeWidth="2" />
            <circle cx="100" cy="160" r="6.5" fill="#6cc0ee" opacity="0.9" />
            <rect x="78" y="150" width="12" height="9" rx="2" fill="#e9eef2" opacity="0.8" transform="rotate(-6 84 154)" />
            <rect x="110" y="166" width="14" height="9" rx="2" fill="#f0b429" opacity="0.8" transform="rotate(5 117 170)" />
          </g>
        )}

        {working && workingVariant === 'paper' && (
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
            <path d="M36 182 L54 168 L64 176 L48 182 Z" fill={hoodie} stroke="#1e293b" strokeWidth="1" />
            <path d="M164 182 L146 168 L136 176 L152 182 Z" fill={hoodie} stroke="#1e293b" strokeWidth="1" />

            {/* White page block BEHIND the covers — only its top edge peeks out above the
                dark covers (the edge of the stacked sheets). Valley (∨) at center. */}
            <path d="M50 122 C 66 124 84 132 100 138 C 116 132 134 124 150 122 L 148 128 C 134 130 116 138 100 154 C 84 138 66 130 52 128 Z" fill="#f8fafc" stroke="#d9d2c4" strokeWidth="1" />
            <g stroke="#9aa4b2" strokeWidth="1.1" strokeLinecap="round">
              <line x1="60" y1="128" x2="92" y2="141" />
              <line x1="140" y1="128" x2="108" y2="141" />
            </g>

            {/* Covers (the outside, facing us while the coder reads the inside): the
                gutter dips at the center and the corners droop into the hands. */}
            <path d="M100 152 C 84 140 68 134 52 130 L 60 182 C 78 178 90 177 100 176 Z" fill="#20242b" stroke="#0f1216" strokeWidth="1.5" />
            <path d="M100 152 C 116 140 132 134 148 130 L 140 182 C 122 178 110 177 100 176 Z" fill="#20242b" stroke="#0f1216" strokeWidth="1.5" />
            <line x1="100" y1="138" x2="100" y2="176" stroke="#0f1216" strokeWidth="1.4" />

            {/* Hands gripping the lower-outer corners, fingers curling over the page */}
            <g fill={skin} stroke={skinShadow} strokeWidth="1">
              <ellipse cx="62" cy="176" rx="9.5" ry="7" />
              <rect x="55" y="166" width="7" height="12" rx="3.5" />
              <rect x="61" y="167" width="7" height="11" rx="3.5" />
              <rect x="67" y="169" width="6" height="10" rx="3" />
            </g>
            <g fill={skin} stroke={skinShadow} strokeWidth="1">
              <ellipse cx="138" cy="176" rx="9.5" ry="7" />
              <rect x="138" y="166" width="7" height="12" rx="3.5" />
              <rect x="132" y="167" width="7" height="11" rx="3.5" />
              <rect x="127" y="169" width="6" height="10" rx="3" />
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
