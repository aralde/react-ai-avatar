import React from 'react';
import { AvatarCustomization } from './DefaultAvatar';

import { AvatarState } from '../lib/types';

export interface CoderAvatarProps {
  size?: number;
  customization?: Partial<AvatarCustomization>;
  state?: AvatarState;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * CoderAvatar — customizable SVG developer avatar.
 * Matches the reference developer image with hoodie, headphones, glasses, beard, and dual monitors.
 * Implements the #rra-* layer contract for useAvatarRuntime.
 */
export function CoderAvatar({
  size = 300,
  customization,
  state,
  className,
  style,
}: CoderAvatarProps) {
  const {
    skinColor = '#e0a980',
    hairColor = '#1c1919',
    clothingColor = '#1d70b8',
    hoodieColor = '#363b43',
    bgColor = '#344e56',
    glasses = true,
    glassesColor = '#1a202c',
    headphones = true,
    headphonesColor = '#2d3748',
  } = customization ?? {};

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Coder Avatar"
      className={className}
      style={style}
    >
      {/* Main Background Circle */}
      <circle cx="100" cy="100" r="79" fill={bgColor} />

      {/* Clip path for the workspace */}
      <clipPath id="coder-clip">
        <circle cx="100" cy="100" r="79" />
      </clipPath>

      <g clipPath="url(#coder-clip)">
        {/* BACKGROUND WORKSPACE DETAILS */}
        {/* Overhead ceiling light beam */}
        <polygon points="60 21 140 21 185 140 15 140" fill="#ffffff" opacity="0.08" />
        <rect x="75" y="21" width="50" height="5" rx="1.5" fill="#2d3748" />
        <rect x="80" y="26" width="40" height="1.5" fill="#edf2f7" />

        {/* Left Monitor */}
        <rect x="25" y="85" width="52" height="34" rx="2.5" fill="#1b2a2d" stroke="#48686f" strokeWidth="2" />
        <path d="M51 119 L51 129 M44 129 L58 129" stroke="#48686f" strokeWidth="2" strokeLinecap="round" />
        {/* Code Lines on Left Monitor */}
        <g stroke={state === 'working' ? '#34d399' : '#10b981'} strokeWidth="1.2" strokeLinecap="round" opacity={state === 'working' ? 0.95 : 0.45} style={{ transition: 'all 0.3s ease' }}>
          <path d="M30 91 L48 91 M30 96 L40 96 M30 101 L52 101 M30 106 L44 106 M30 111 L36 111" />
        </g>

        {/* Right Monitor */}
        <rect x="123" y="85" width="52" height="34" rx="2.5" fill="#1b2a2d" stroke="#48686f" strokeWidth="2" />
        <path d="M149 119 L149 129 M142 129 L156 129" stroke="#48686f" strokeWidth="2" strokeLinecap="round" />
        {/* Code Lines on Right Monitor */}
        <g stroke={state === 'working' ? '#34d399' : '#10b981'} strokeWidth="1.2" strokeLinecap="round" opacity={state === 'working' ? 0.95 : 0.45} style={{ transition: 'all 0.3s ease' }}>
          <path d="M128 91 L142 91 M128 96 L160 96 M128 101 L146 101 M128 106 L154 106 M128 111 L138 111" />
        </g>

        {/* Desk */}
        <rect x="10" y="129" width="180" height="52" fill="#8c4e25" />
        <rect x="10" y="129" width="180" height="2.5" fill="#a05a2c" />

        {/* Plants on desk */}
        {/* Left Plant */}
        <path d="M22 135 L24 124 L32 124 L34 135 Z" fill="#b0563c" />
        <path d="M21 124 L35 124" stroke="#8c3d28" strokeWidth="1.2" strokeLinecap="round" />
        <g fill="#48bb78">
          <path d="M28 124 Q25 110 28 105 Q31 110 28 124" fill="#38a169" />
          <path d="M25 124 Q21 115 25 112 Q28 116 28 124" />
          <path d="M31 124 Q35 115 31 112 Q28 116 28 124" />
        </g>

        {/* Right Plant */}
        <path d="M166 135 L168 124 L176 124 L178 135 Z" fill="#b0563c" />
        <path d="M165 124 L179 124" stroke="#8c3d28" strokeWidth="1.2" strokeLinecap="round" />
        <g fill="#48bb78">
          <path d="M172 124 Q169 110 172 105 Q175 110 172 124" fill="#38a169" />
          <path d="M169 124 Q165 115 169 112 Q172 116 172 124" />
          <path d="M175 124 Q179 115 175 112 Q172 116 172 124" />
        </g>

        {/* CODER CHARACTER */}

        {/* Neck */}
        <path d="M85 114 Q83 142 78 152 L122 152 Q117 142 115 114 Z" fill={skinColor} />
        {/* Chin shadow for depth */}
        <path d="M85 118 Q100 130 115 118 Q100 126 85 118 Z" fill="#a05b35" opacity="0.45" />

        {/* Body - Hoodie & T-shirt */}
        {/* Hoodie Back / Shoulders */}
        <path d="M30 185 Q40 142 70 140 Q85 152 100 152 Q115 152 130 140 Q160 142 170 185 Z" fill={hoodieColor} />
        {/* Hoodie collar lining */}
        <path d="M72 142 Q100 152 128 142" fill="none" stroke="#1c1f24" strokeWidth="4.5" strokeLinecap="round" opacity="0.3" />

        {/* T-Shirt */}
        <path d="M84 145 L100 185 L116 145 Z" fill={clothingColor} />

        {/* Circuit board microchip pattern on T-Shirt */}
        <g stroke="#60b3f0" strokeWidth="1.1" fill="none" opacity="0.85">
          <rect x="94" y="157" width="12" height="12" rx="1" fill={clothingColor} stroke="#60b3f0" strokeWidth="1.1" />
          <path d="M94 163 L86 163 M106 163 L114 163 M100 157 L100 150 M100 169 L100 178 M97 157 L97 152 M103 157 L103 152 M97 169 L97 174 M103 169 L103 174" />
          <circle cx="85" cy="163" r="1.1" fill="#60b3f0" stroke="none" />
          <circle cx="115" cy="163" r="1.1" fill="#60b3f0" stroke="none" />
          <circle cx="100" cy="149" r="1.1" fill="#60b3f0" stroke="none" />
        </g>

        {/* Hoodie drawstrings */}
        <path d="M82 144 L80 168 M118 144 L120 168" stroke="#f7fafc" strokeWidth="2" strokeLinecap="round" />
        <circle cx="80" cy="169.5" r="1.3" fill="#cbd5e0" />
        <circle cx="120" cy="169.5" r="1.3" fill="#cbd5e0" />

        {/* Head Base & Ears */}
        <circle cx="63" cy="98" r="7.5" fill={skinColor} />
        <circle cx="137" cy="98" r="7.5" fill={skinColor} />
        <ellipse id="rra-head" cx="100" cy="96" rx="36" ry="32" fill={skinColor} />

        {/* Beard & Mustache */}
        {/* Full beard hugging jaw */}
        <path
          d="M64 92
             C63 108, 70 127, 100 127
             C130 127, 137 108, 136 92
             C135 100, 131 105, 127 107
             C120 114, 115 116, 100 116
             C85 116, 80 114, 73 107
             C69 105, 65 100, 64 92 Z"
          fill={hairColor}
        />
        {/* Soul patch under lip */}
        <path d="M97 121 L103 121 L100 125 Z" fill={hairColor} />
        {/* Mustache */}
        <path
          d="M84 113
             Q100 107 116 113
             Q119 118 114 118
             Q100 115 86 118
             Q81 118 84 113 Z"
          fill={hairColor}
        />

        {/* Headphone Band (drawn behind ears / hair, but in front of neck/shoulders) */}
        {headphones && (
          <path
            d="M72 134 Q100 148 128 134"
            fill="none"
            stroke="#1a202c"
            strokeWidth="5"
            strokeLinecap="round"
          />
        )}

        {/* Hair */}
        <path
          d="M64 90
             Q59 75, 63 65
             Q66 52, 79 48
             Q86 45, 96 48
             Q105 40, 118 44
             Q132 48, 136 68
             Q139 78, 136 90
             Q128 80, 122 82
             Q105 70, 90 82
             Q75 75, 64 90 Z"
          fill={hairColor}
        />
        {/* Messy quiff sweeps/tufts */}
        <path d="M68 52 Q62 38, 76 42 Q70 47, 68 52 Z" fill={hairColor} />
        <path d="M85 47 Q95 32, 110 38 Q100 44, 85 47 Z" fill={hairColor} />
        <path d="M115 44 Q125 35, 130 46 Q122 45, 115 44 Z" fill={hairColor} />

        {/* Eyebrows */}
        <path d="M70 80 Q80 72 91 78" fill="none" stroke={hairColor} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M109 78 Q120 72 130 80" fill="none" stroke={hairColor} strokeWidth="3.2" strokeLinecap="round" />

        {/* Eye Systems (Blinking lids + pupils) */}
        {/* Left Eye */}
        <g id="rra-eyeL">
          <ellipse cx="81" cy="90" rx="9" ry="8" fill="#ffffff" />
          <circle className="rra-pupil" data-base-x="81" data-base-y="90" cx="81" cy="90" r="4.2" fill="#1c1919" />
          <circle cx="82.5" cy="88" r="1.3" fill="#ffffff" />
          <rect className="rra-lid" data-max-height="17" x="70" y="80" width="22" height="0" fill={skinColor} />
        </g>
        {/* Right Eye */}
        <g id="rra-eyeR">
          <ellipse cx="119" cy="90" rx="9" ry="8" fill="#ffffff" />
          <circle className="rra-pupil" data-base-x="119" data-base-y="90" cx="119" cy="90" r="4.2" fill="#1c1919" />
          <circle cx="120.5" cy="88" r="1.3" fill="#ffffff" />
          <rect className="rra-lid" data-max-height="17" x="108" y="80" width="22" height="0" fill={skinColor} />
        </g>

        {/* Glasses (drawn on top of the eyes/lids so frame doesn't get covered by blink) */}
        {glasses && (
          <g>
            {/* Bridge */}
            <path d="M95.5 89.5 Q100 85.5 104.5 89.5" fill="none" stroke={glassesColor} strokeWidth="2.8" />
            {/* Frame Circles */}
            <circle cx="81" cy="90" r="14.5" fill="none" stroke={glassesColor} strokeWidth="2.8" />
            <circle cx="119" cy="90" r="14.5" fill="none" stroke={glassesColor} strokeWidth="2.8" />
            {/* Temples/Sides */}
            <path d="M66.5 90 L59 87" fill="none" stroke={glassesColor} strokeWidth="2.5" />
            <path d="M133.5 90 L141 87" fill="none" stroke={glassesColor} strokeWidth="2.5" />
            {/* Lens reflections */}
            <path d="M71 80 A14.5 14.5 0 0 1 93 84" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.3" strokeLinecap="round" />
            <path d="M109 80 A14.5 14.5 0 0 1 131 84" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.3" strokeLinecap="round" />
          </g>
        )}

        {/* Headphones Earcups around Neck (drawn on top of hoodie/shoulders) */}
        {headphones && (
          <g>
            {/* Left Earcup */}
            <g transform="rotate(-15 67 138)">
              <rect x="57" y="123" width="20" height="30" rx="6" fill={headphonesColor} stroke="#1a202c" strokeWidth="2.5" />
              <rect x="63" y="128" width="8" height="20" rx="3" fill="#1a202c" />
            </g>
            {/* Right Earcup */}
            <g transform="rotate(15 133 138)">
              <rect x="123" y="123" width="20" height="30" rx="6" fill={headphonesColor} stroke="#1a202c" strokeWidth="2.5" />
              <rect x="129" y="128" width="8" height="20" rx="3" fill="#1a202c" />
            </g>
            {/* Cord going down */}
            <path d="M100 151 Q104 167 100 185" fill="none" stroke="#1a202c" strokeWidth="1.5" />
          </g>
        )}

        {/* Nose */}
        <path d="M96 103 Q100 106 104 103" fill="none" stroke="#a05b35" strokeWidth="2.2" strokeLinecap="round" />

        {/* Mouth */}
        <ellipse
          id="rra-mouth"
          cx="100"
          cy="116"
          rx="9"
          ry="2.2"
          fill="#3a2e28"
          stroke="#1c1919"
          strokeWidth="1.8"
        />
      </g>

      {/* Floating thought bubble (outside clip) */}
      <g id="rra-think" opacity="0">
        <circle cx="150" cy="54" r="4" fill="#ffffff" stroke="#8b5cf6" strokeWidth="2" />
        <circle cx="165" cy="42" r="5.5" fill="#ffffff" stroke="#8b5cf6" strokeWidth="2" />
        <circle cx="182" cy="28" r="7" fill="#ffffff" stroke="#8b5cf6" strokeWidth="2.5" />
      </g>
    </svg>
  );
}
