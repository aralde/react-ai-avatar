import React from 'react';
import { AvatarCustomization } from './DefaultAvatar';

/**
 * GeometricAvatar — minimalist geometric SVG avatar (head only).
 *
 * Purpose: the library's default preset AND the canonical example of the
 * layer contract (see useAvatarRuntime). Purely presentational: it does not
 * animate by itself — it exposes stable ids/classes the runtime drives.
 *
 * License: MIT. Own design (no third-party assets, no attribution needed).
 */

export interface GeometricAvatarProps {
  size?: number;
  customization?: Partial<AvatarCustomization>;
  mouthColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function GeometricAvatar({
  size = 300,
  customization,
  mouthColor = '#7a3b2e',
  className,
  style,
}: GeometricAvatarProps) {
  const {
    skinColor = '#f5c7a9',
    hairColor = '#2c2c2c',
    clothingColor = '#3b7b9b',
    hoodieColor = '#3a3e45',
    bgColor = '#88c0b7',
    glasses = true,
    glassesColor = '#2c2c2c',
    headphones = true,
    headphonesColor = '#3a3b40',
  } = customization ?? {};

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
      <circle cx="100" cy="100" r="78" fill={bgColor} />
      <clipPath id="rra-clip"><circle cx="100" cy="100" r="78" /></clipPath>

      <g clipPath="url(#rra-clip)">
        <rect id="rra-clothing" x="48" y="150" width="104" height="60" rx="20" fill={clothingColor} />
        <path id="rra-hoodie" d="M52 168 Q52 140 100 140 Q148 140 148 168 L148 210 L52 210 Z" fill={hoodieColor} />
        <rect id="rra-neck" x="88" y="120" width="24" height="28" rx="10" fill={skinColor} opacity="0.85" />
        <ellipse id="rra-head" cx="100" cy="92" rx="42" ry="46" fill={skinColor} />
        <path id="rra-hair" d="M58 88 Q56 44 100 44 Q144 44 142 88 Q142 70 128 62 Q120 76 100 74 Q80 76 72 62 Q58 70 58 88 Z" fill={hairColor} />

        {headphones && (
          <g id="rra-headphones">
            <rect x="50" y="84" width="12" height="26" rx="6" fill={headphonesColor} />
            <rect x="138" y="84" width="12" height="26" rx="6" fill={headphonesColor} />
            <path d="M56 90 Q56 50 100 50 Q144 50 144 90" fill="none" stroke={headphonesColor} strokeWidth="7" strokeLinecap="round" />
          </g>
        )}

        <g id="rra-eyeL">
          <ellipse cx="84" cy="90" rx="9" ry="7" fill="#ffffff" />
          <circle className="rra-pupil" data-base-x="84" data-base-y="90" cx="84" cy="90" r="4" fill="#2c2c2c" />
          <rect className="rra-lid" data-max-height="17" x="74" y="80" width="20" height="0" fill={skinColor} />
        </g>
        <g id="rra-eyeR">
          <ellipse cx="116" cy="90" rx="9" ry="7" fill="#ffffff" />
          <circle className="rra-pupil" data-base-x="116" data-base-y="90" cx="116" cy="90" r="4" fill="#2c2c2c" />
          <rect className="rra-lid" data-max-height="17" x="106" y="80" width="20" height="0" fill={skinColor} />
        </g>

        {glasses && (
          <g id="rra-glasses">
            <rect x="72" y="82" width="24" height="16" rx="6" fill="none" stroke={glassesColor} strokeWidth="2.5" />
            <rect x="104" y="82" width="24" height="16" rx="6" fill="none" stroke={glassesColor} strokeWidth="2.5" />
            <line x1="96" y1="90" x2="104" y2="90" stroke={glassesColor} strokeWidth="2.5" />
          </g>
        )}

        <ellipse id="rra-mouth" cx="100" cy="112" rx="9" ry="3" fill={mouthColor} />
      </g>

      <g id="rra-think" opacity="0">
        <circle cx="150" cy="56" r="4" fill="#8b5cf6" />
        <circle cx="164" cy="44" r="5.5" fill="#8b5cf6" />
        <circle cx="181" cy="30" r="7" fill="#8b5cf6" />
      </g>
    </svg>
  );
}
