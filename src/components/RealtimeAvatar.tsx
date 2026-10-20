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

/** Animation tuning for the faces with eyes and a mouth (presets, byos, 3D). */
export interface FaceTuningProps {
  maxMouthOpening?: number;
  blinkIntervalMin?: number;
  blinkIntervalMax?: number;
  blinkDuration?: number;
  mouseTrackingIntensity?: number;
}

/** Every variant-specific prop. Each variant allows its own and forbids the rest. */
interface VariantOnlyProps extends FaceTuningProps {
  children?: React.ReactNode;
  customization?: Partial<AvatarCustomization>;
  vrmUrl?: string;
  glbUrl?: string;
  dicebearCollection?: DiceBearCollection | string;
  dicebearSeed?: string;
}

/** Marks the variant-specific props a variant doesn't take, so passing one is a type error. */
type Without<K extends keyof VariantOnlyProps> = { [P in K]?: never };

type CommonProps = AvatarChromeProps & MouthDriverProps;

/** A flat preset. `variant` defaults to `'geometric'` when there are no children. */
export type PresetAvatarProps = CommonProps &
  FaceTuningProps &
  Without<'children' | 'vrmUrl' | 'glbUrl' | 'dicebearCollection' | 'dicebearSeed'> & {
    variant?: 'geometric' | 'memoji' | 'pixelart' | 'doodle';
    /** Colors and accessories; only the ones you pass change. */
    customization?: Partial<AvatarCustomization>;
  };

/** Your own face: children imply `variant="byos"`, and they inherit `state`. */
export type ByosAvatarProps = CommonProps &
  FaceTuningProps &
  Without<'customization' | 'vrmUrl' | 'glbUrl' | 'dicebearCollection' | 'dicebearSeed'> & {
    variant?: 'byos';
    /**
     * An SVG on the `#rra-*` contract, or a component like `SquirrelAvatar`.
     * It inherits `state` from the avatar, so there is no need to pass it twice.
     */
    children: React.ReactNode;
  };

/** The voice-assistant sphere: no eyes or mouth, so no face tuning. */
export type OrbVariantProps = CommonProps &
  Without<keyof VariantOnlyProps> & {
    variant: 'orb';
  };

export type DiceBearVariantProps = CommonProps &
  Without<Exclude<keyof VariantOnlyProps, 'maxMouthOpening' | 'dicebearCollection' | 'dicebearSeed'>> & {
    variant: 'dicebear';
    maxMouthOpening?: number;
    /** DiceBear style id (curated CC0 set). */
    dicebearCollection?: DiceBearCollection | string;
    /** Deterministic seed: same seed and style, same face. */
    dicebearSeed?: string;
  };

export type VrmVariantProps = CommonProps &
  FaceTuningProps &
  Without<'children' | 'customization' | 'glbUrl' | 'dicebearCollection' | 'dicebearSeed'> & {
    variant: 'vrm';
    /** VRM model URL. */
    vrmUrl: string;
  };

export type GlbVariantProps = CommonProps &
  FaceTuningProps &
  Without<'children' | 'customization' | 'vrmUrl' | 'dicebearCollection' | 'dicebearSeed'> & {
    variant: 'glb';
    /** CORS-enabled .glb URL with ARKit blendshapes. */
    glbUrl: string;
  };

/**
 * One shape per `variant`: each takes the shared overlay and mouth-driver
 * props plus its own, and a prop that doesn't apply (say `vrmUrl` on the orb)
 * is a type error instead of being ignored.
 */
export type RealtimeAvatarProps =
  | PresetAvatarProps
  | ByosAvatarProps
  | OrbVariantProps
  | DiceBearVariantProps
  | VrmVariantProps
  | GlbVariantProps;

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
