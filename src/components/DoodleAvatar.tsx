import React from 'react';
import { AvatarCustomization } from './DefaultAvatar';
import { AvatarState } from '../lib/types';

/**
 * DoodleAvatar — hand-drawn ink-on-paper sketch style: wobbly outlines,
 * scribbled hair, slightly imperfect strokes. The "imperfection" is drawn
 * into the paths; the runtime adds the life (blink, gaze, mouth).
 *
 * Implements the layer contract (see useAvatarRuntime).
 * License: MIT. Own design (no third-party assets).
 */

export interface DoodleAvatarProps {
  size?: number;
  customization?: Partial<AvatarCustomization>;
  inkColor?: string;
  /** Accepted for a uniform preset API; this head-only preset doesn't use it. */
  state?: AvatarState;
  className?: string;
  style?: React.CSSProperties;
}

export function DoodleAvatar({
  size = 300,
  customization,
  inkColor = '#2f2a26',
  className,
  style,
}: DoodleAvatarProps) {
  const {
    skinColor = '#fdf6ec', // paper tone by default
    hairColor = '#2f2a26',
    bgColor = '#fffdf8',
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
      <circle cx="100" cy="100" r="79" fill={bgColor} />

      <clipPath id="rra-doodle-clip"><circle cx="100" cy="100" r="79" /></clipPath>
      <g clipPath="url(#rra-doodle-clip)">
        {/* Shoulders: two quick strokes */}
        <path d="M52 182 Q60 148 100 146 Q140 148 148 182" fill="#ffffff" stroke={inkColor} strokeWidth="3" strokeLinecap="round" />
        <path d="M88 150 L86 134 M112 150 L114 134" fill="none" stroke={inkColor} strokeWidth="2.5" strokeLinecap="round" />

        {/* Head: wobbly hand-drawn outline */}
        <path
          id="rra-head"
          d="M100 46
             Q140 44 143 90
             Q145 122 122 134
             Q101 143 79 133
             Q56 121 58 88
             Q62 45 100 46 Z"
          fill={skinColor}
          stroke={inkColor}
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Hair: scribble strokes */}
        <g id="rra-hair" fill="none" stroke={hairColor} strokeWidth="3" strokeLinecap="round">
          <path d="M62 84 Q58 52 88 47 Q72 56 74 64 Q80 50 104 46 Q92 54 96 60 Q106 48 126 52 Q116 58 120 64 Q130 56 140 78 Q132 66 122 68" />
          <path d="M66 76 Q70 62 82 58" opacity="0.7" />
          <path d="M118 56 Q130 62 134 76" opacity="0.7" />
        </g>

        {/* Brows: quick flicks */}
        <path d="M70 80 Q80 74 90 78" fill="none" stroke={inkColor} strokeWidth="3" strokeLinecap="round" />
        <path d="M110 78 Q120 74 130 80" fill="none" stroke={inkColor} strokeWidth="3" strokeLinecap="round" />

        {/* Eyes: ink circles with dot pupils */}
        <g id="rra-eyeL">
          <ellipse cx="82" cy="92" rx="9" ry="7.5" fill="#ffffff" stroke={inkColor} strokeWidth="2.5" />
          <circle className="rra-pupil" data-base-x="82" data-base-y="92" cx="82" cy="92" r="3.4" fill={inkColor} />
          <rect className="rra-lid" data-max-height="17" x="72" y="83" width="20" height="0" fill={skinColor} />
        </g>
        <g id="rra-eyeR">
          <ellipse cx="118" cy="92" rx="9" ry="7.5" fill="#ffffff" stroke={inkColor} strokeWidth="2.5" />
          <circle className="rra-pupil" data-base-x="118" data-base-y="92" cx="118" cy="92" r="3.4" fill={inkColor} />
          <rect className="rra-lid" data-max-height="17" x="108" y="83" width="20" height="0" fill={skinColor} />
        </g>

        {/* Nose: single stroke */}
        <path d="M99 100 Q96 110 103 112" fill="none" stroke={inkColor} strokeWidth="2.5" strokeLinecap="round" />

        {/* Mouth: inked ellipse that opens */}
        <ellipse id="rra-mouth" cx="100" cy="122" rx="9" ry="2.5" fill="#3a2e28" stroke={inkColor} strokeWidth="2" />

        {/* A couple of sketch hatches on the cheek */}
        <path d="M64 106 L70 102 M67 110 L73 106" stroke={inkColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
      </g>

      {/* Thought bubble: sketched circles */}
      <g id="rra-think" opacity="0">
        <circle cx="150" cy="56" r="4" fill="#ffffff" stroke="#8b5cf6" strokeWidth="2" />
        <circle cx="164" cy="44" r="5.5" fill="#ffffff" stroke="#8b5cf6" strokeWidth="2" />
        <circle cx="181" cy="30" r="7" fill="#ffffff" stroke="#8b5cf6" strokeWidth="2.5" />
      </g>
    </svg>
  );
}
