import React from 'react';
import { AvatarCustomization } from './DefaultAvatar';

/**
 * PixelArtAvatar — retro avatar on a logical 32x32 grid.
 *
 * Everything renders with crisp edges, and motion is intentionally chunky:
 * the runtime snaps the mouth and pupils to whole pixels (`data-quantize`),
 * and the eyelids close in two frames worth of pixels. That quantized look
 * IS the aesthetic.
 *
 * Implements the layer contract (see useAvatarRuntime).
 * License: MIT. Own design (no third-party assets).
 */

export interface PixelArtAvatarProps {
  size?: number;
  customization?: Partial<AvatarCustomization>;
  className?: string;
  style?: React.CSSProperties;
}

export function PixelArtAvatar({
  size = 300,
  customization,
  className,
  style,
}: PixelArtAvatarProps) {
  const {
    skinColor = '#f0b58a',
    hairColor = '#3a2a1e',
    clothingColor = '#2f6f8f',
    bgColor = '#9ad1c8',
  } = customization ?? {};

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Avatar"
      className={className}
      style={{ imageRendering: 'pixelated', ...style }}
      shapeRendering="crispEdges"
    >
      <rect x="2" y="2" width="28" height="28" fill={bgColor} />

      {/* Shoulders / clothing */}
      <rect id="rra-clothing" x="8" y="26" width="16" height="4" fill={clothingColor} />
      <rect x="10" y="25" width="12" height="1" fill={clothingColor} />

      {/* Neck */}
      <rect x="14" y="23" width="4" height="3" fill={skinColor} />

      {/* Head block */}
      <rect id="rra-head" x="9" y="7" width="14" height="16" fill={skinColor} />

      {/* Hair: top cap + sides + fringe notches */}
      <g id="rra-hair">
        <rect x="8" y="4" width="16" height="4" fill={hairColor} />
        <rect x="8" y="8" width="2" height="5" fill={hairColor} />
        <rect x="22" y="8" width="2" height="5" fill={hairColor} />
        <rect x="11" y="8" width="3" height="1" fill={hairColor} />
        <rect x="17" y="8" width="4" height="1" fill={hairColor} />
      </g>

      {/* Eyes: 3x2 whites with 1x1 square pupils, quantized to the grid */}
      <g id="rra-eyeL">
        <rect x="11" y="12" width="3" height="2" fill="#ffffff" />
        <rect className="rra-pupil" data-base-x="12" data-base-y="12.5" data-quantize="1" x="12" y="12.5" width="1" height="1" fill="#1c1c1c" />
        <rect className="rra-lid" data-max-height="2" x="11" y="12" width="3" height="0" fill={skinColor} />
      </g>
      <g id="rra-eyeR">
        <rect x="18" y="12" width="3" height="2" fill="#ffffff" />
        <rect className="rra-pupil" data-base-x="19" data-base-y="12.5" data-quantize="1" x="19" y="12.5" width="1" height="1" fill="#1c1c1c" />
        <rect className="rra-lid" data-max-height="2" x="18" y="12" width="3" height="0" fill={skinColor} />
      </g>

      {/* Nose pixel */}
      <rect x="15" y="15" width="2" height="1" fill="#d49a72" />

      {/* Mouth: a rect that grows downward in whole pixels */}
      <rect id="rra-mouth" data-quantize="1" x="13" y="18" width="6" height="1" fill="#5a1f1f" />

      {/* Thought bubble: pixel squares */}
      <g id="rra-think" opacity="0">
        <rect x="24" y="9" width="1" height="1" fill="#8b5cf6" />
        <rect x="26" y="7" width="1.5" height="1.5" fill="#8b5cf6" />
        <rect x="28" y="4" width="2" height="2" fill="#8b5cf6" />
      </g>
    </svg>
  );
}
