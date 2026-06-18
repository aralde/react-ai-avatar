import React, { useId } from 'react';
import { AvatarCustomization } from './DefaultAvatar';

/**
 * MemojiAvatar — soft, volumetric SVG head in the spirit of Apple's memoji:
 * radial gradients for skin volume, glossy eyes with highlights, blush.
 *
 * Implements the layer contract (see useAvatarRuntime).
 * License: MIT. Own design (no third-party assets).
 */

export interface MemojiAvatarProps {
  size?: number;
  customization?: Partial<AvatarCustomization>;
  className?: string;
  style?: React.CSSProperties;
}

export function MemojiAvatar({
  size = 300,
  customization,
  className,
  style,
}: MemojiAvatarProps) {
  const {
    skinColor = '#f6c8a8',
    hairColor = '#5b3a23',
    bgColor = '#dbe7f4',
  } = customization ?? {};

  // Unique gradient ids so several avatars can coexist on one page.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const skinGrad = `rra-skin-${uid}`;
  const bgGrad = `rra-bg-${uid}`;
  const hairGrad = `rra-hair-${uid}`;
  const mouthGrad = `rra-mouthg-${uid}`;

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
      <defs>
        <radialGradient id={skinGrad} cx="0.38" cy="0.32" r="0.85">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="35%" stopColor={skinColor} />
          <stop offset="100%" stopColor={skinColor} stopOpacity="1" />
        </radialGradient>
        <radialGradient id={bgGrad} cx="0.5" cy="0.35" r="0.9">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor={bgColor} />
        </radialGradient>
        <linearGradient id={hairGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hairColor} stopOpacity="0.85" />
          <stop offset="100%" stopColor={hairColor} />
        </linearGradient>
        <linearGradient id={mouthGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c2f33" />
          <stop offset="100%" stopColor="#52181c" />
        </linearGradient>
      </defs>

      <circle cx="100" cy="100" r="78" fill={`url(#${bgGrad})`} />
      <clipPath id={`rra-memoji-clip-${uid}`}><circle cx="100" cy="100" r="78" /></clipPath>

      <g clipPath={`url(#rra-memoji-clip-${uid})`}>
        {/* Neck + shoulders hint */}
        <rect x="86" y="128" width="28" height="30" rx="12" fill={skinColor} />
        <ellipse cx="100" cy="178" rx="52" ry="28" fill="#ffffff" opacity="0.85" />

        {/* Head with soft volume */}
        <ellipse id="rra-head" cx="100" cy="94" rx="44" ry="48" fill={`url(#${skinGrad})`} />
        {/* Chin shadow */}
        <ellipse cx="100" cy="132" rx="20" ry="7" fill="#000000" opacity="0.06" />
        {/* Ears */}
        <ellipse cx="55" cy="96" rx="7" ry="11" fill={skinColor} />
        <ellipse cx="145" cy="96" rx="7" ry="11" fill={skinColor} />

        {/* Hair: soft swoop */}
        <path
          id="rra-hair"
          d="M54 92 Q50 38 100 40 Q150 38 146 92 Q146 66 126 58 Q120 72 96 68 Q72 72 66 58 Q54 66 54 92 Z"
          fill={`url(#${hairGrad})`}
        />

        {/* Brows */}
        <path d="M70 76 Q82 70 92 75" fill="none" stroke={hairColor} strokeWidth="4" strokeLinecap="round" opacity="0.9" />
        <path d="M108 75 Q118 70 130 76" fill="none" stroke={hairColor} strokeWidth="4" strokeLinecap="round" opacity="0.9" />

        {/* Eyes: glossy with iris + highlight */}
        <g id="rra-eyeL">
          <ellipse cx="81" cy="92" rx="10.5" ry="8.5" fill="#ffffff" />
          <circle className="rra-pupil" data-base-x="81" data-base-y="92" cx="81" cy="92" r="5" fill="#3d2c20" />
          <circle cx="83" cy="89.5" r="1.7" fill="#ffffff" opacity="0.95" />
          <rect className="rra-lid" data-max-height="19" x="69" y="82" width="24" height="0" rx="3" fill={skinColor} />
        </g>
        <g id="rra-eyeR">
          <ellipse cx="119" cy="92" rx="10.5" ry="8.5" fill="#ffffff" />
          <circle className="rra-pupil" data-base-x="119" data-base-y="92" cx="119" cy="92" r="5" fill="#3d2c20" />
          <circle cx="121" cy="89.5" r="1.7" fill="#ffffff" opacity="0.95" />
          <rect className="rra-lid" data-max-height="19" x="107" y="82" width="24" height="0" rx="3" fill={skinColor} />
        </g>

        {/* Blush */}
        <ellipse cx="70" cy="108" rx="8" ry="4.5" fill="#e98a7a" opacity="0.35" />
        <ellipse cx="130" cy="108" rx="8" ry="4.5" fill="#e98a7a" opacity="0.35" />

        {/* Nose */}
        <path d="M97 100 Q95 108 100 110 Q105 108 103 100" fill="none" stroke="#c98f6f" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />

        {/* Mouth */}
        <ellipse id="rra-mouth" cx="100" cy="120" rx="9.5" ry="3.5" fill={`url(#${mouthGrad})`} />
      </g>

      <g id="rra-think" opacity="0">
        <circle cx="150" cy="56" r="4" fill="#8b5cf6" />
        <circle cx="164" cy="44" r="5.5" fill="#8b5cf6" />
        <circle cx="181" cy="30" r="7" fill="#8b5cf6" />
      </g>
    </svg>
  );
}
