import React, { Suspense } from 'react';
import { ContractAvatar } from './ContractAvatar';
import { GeometricAvatar } from './GeometricAvatar';
import { MemojiAvatar } from './MemojiAvatar';
import { PixelArtAvatar } from './PixelArtAvatar';
import { DoodleAvatar } from './DoodleAvatar';
import { OrbAvatar } from './OrbAvatar';
import { AvatarFrame, type AvatarChromeProps } from './AvatarFrame';
import type { AvatarCustomization } from '../lib/types';
import type { DiceBearCollection } from '../lib/dicebear';
import { useMouthSource, type MouthDriverProps } from '../lib/useMouthSource';

// The heavy renderers are lazy chunks: the three.js stack (optional peers) is
// only fetched when variant="vrm" / "glb" renders, and the DiceBear renderer
// (whose @dicebear/* peers it imports dynamically itself) when variant="dicebear".
const VrmAvatarLazy = /* @__PURE__ */ React.lazy(() =>
  import('./VrmAvatar').then((m) => ({ default: m.VrmAvatar }))
);
const GlbAvatarLazy = /* @__PURE__ */ React.lazy(() =>
  import('./GlbArkitAvatar').then((m) => ({ default: m.GlbArkitAvatar }))
);
const DiceBearAvatarLazy = /* @__PURE__ */ React.lazy(() =>
  import('./DiceBearAvatar').then((m) => ({ default: m.DiceBearAvatar }))
);

export type RealtimeAvatarVariant =
  | 'geometric'
  | 'memoji'
  | 'pixelart'
  | 'doodle'
  | 'orb'
  | 'vrm'
  | 'glb'
  | 'dicebear'
  | 'byos';

export interface RealtimeAvatarProps extends AvatarChromeProps, MouthDriverProps {
  /**
   * Which face to draw. Defaults to `'byos'` when you pass `children`, else
   * `'geometric'`.
   */
  variant?: RealtimeAvatarVariant;
  /**
   * Your own face for `variant="byos"`: an SVG on the `#rra-*` contract, or a
   * component like `SquirrelAvatar`. It inherits `state` from the avatar, so
   * there is no need to pass it twice.
   */
  children?: React.ReactNode;
  /** VRM model URL, for variant="vrm". */
  vrmUrl?: string;
  /** CORS-enabled .glb URL with ARKit blendshapes, for variant="glb". */
  glbUrl?: string;
  /** DiceBear style id (curated CC0 set), for variant="dicebear". */
  dicebearCollection?: DiceBearCollection | string;
  /** Deterministic DiceBear seed, for variant="dicebear". */
  dicebearSeed?: string;

  // Animation tuning
  maxMouthOpening?: number;
  blinkIntervalMin?: number;
  blinkIntervalMax?: number;
  blinkDuration?: number;
  mouseTrackingIntensity?: number;

  /** Colors and accessories for the flat presets. */
  customization?: AvatarCustomization;
}

const PRESETS = {
  geometric: GeometricAvatar,
  memoji: MemojiAvatar,
  pixelart: PixelArtAvatar,
  doodle: DoodleAvatar,
} as const;

/** The face fills the frame; the frame owns the size. */
const FILL = '100%';

export function RealtimeAvatar({
  variant,
  children,
  vrmUrl,
  glbUrl,
  dicebearCollection,
  dicebearSeed,
  maxMouthOpening,
  blinkIntervalMin,
  blinkIntervalMax,
  blinkDuration,
  mouseTrackingIntensity,
  customization,
  analyser,
  speechActivity,
  streamingText,
  ...chrome
}: RealtimeAvatarProps) {
  const mouthSource = useMouthSource({ analyser, speechActivity, streamingText });
  const state = chrome.state ?? 'idle';
  const stateColors = chrome.stateColors;
  const kind = variant ?? (children ? 'byos' : 'geometric');

  const runtimeProps = {
    state,
    analyser: mouthSource,
    size: FILL,
    maxMouthOpening,
    blinkIntervalMin,
    blinkIntervalMax,
    blinkDuration,
    mouseTrackingIntensity,
    stateColors,
    customization,
  };

  let face: React.ReactNode;
  if (kind === 'vrm') {
    face = <VrmAvatarLazy {...runtimeProps} vrmUrl={vrmUrl} />;
  } else if (kind === 'glb') {
    face = <GlbAvatarLazy {...runtimeProps} glbUrl={glbUrl} />;
  } else if (kind === 'dicebear') {
    face = (
      <DiceBearAvatarLazy
        state={state}
        analyser={mouthSource}
        size={FILL}
        maxMouthOpening={maxMouthOpening}
        stateColors={stateColors}
        collection={dicebearCollection}
        seed={dicebearSeed}
      />
    );
  } else if (kind === 'orb') {
    face = <OrbAvatar state={state} analyser={mouthSource} stateColors={stateColors} />;
  } else if (kind === 'byos') {
    face = <ContractAvatar {...runtimeProps}>{children}</ContractAvatar>;
  } else {
    const Preset = PRESETS[kind] ?? GeometricAvatar;
    face = (
      // Keyed by variant so switching presets remounts the runtime cleanly
      <ContractAvatar key={kind} {...runtimeProps}>
        <Preset size={FILL} customization={customization} state={state} />
      </ContractAvatar>
    );
  }

  return (
    <AvatarFrame {...chrome} defaultSize={280} mouthSource={mouthSource}>
      <Suspense fallback={null}>{face}</Suspense>
    </AvatarFrame>
  );
}
