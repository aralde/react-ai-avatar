import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RealtimeAvatar } from '../components/RealtimeAvatar';

/*
 * RealtimeAvatar's props are one shape per `variant`. The `@ts-expect-error`
 * lines are the test: `npm run lint` fails if any of them stops being an error.
 */
const Face = () => <svg />;
// A variant picked at runtime, as in a catalog or a settings screen.
const picked = ['memoji', 'orb'][Math.floor(Math.random() * 2)] as 'memoji' | 'orb';

describe('props per variant', () => {
  it('accepts what each variant takes', () => {
    const ok = [
      <RealtimeAvatar key="1" />,
      <RealtimeAvatar key="2" variant="memoji" customization={{ skinColor: '#f1c9a5' }} maxMouthOpening={50} />,
      <RealtimeAvatar key="3" mouseTrackingIntensity={0.5}>
        <Face />
      </RealtimeAvatar>,
      <RealtimeAvatar key="4" variant="orb" state="speaking" stateColors={{ speaking: '#f00' }} />,
      <RealtimeAvatar key="5" variant="dicebear" dicebearCollection="open-peeps" dicebearSeed="x" maxMouthOpening={40} />,
      <RealtimeAvatar key="6" variant="vrm" vrmUrl="/a.vrm" blinkDuration={90} />,
      <RealtimeAvatar key="7" variant="glb" glbUrl="/a.glb" />,
      // Switching variants at runtime works as long as the props fit them all.
      <RealtimeAvatar key="8" variant={picked} state="speaking" />,
    ];
    expect(ok).toHaveLength(8);
  });

  it('rejects props that do not apply', () => {
    const rejected = [
      // @ts-expect-error the orb has no 3D model
      <RealtimeAvatar key="1" variant="orb" vrmUrl="/a.vrm" />,
      // @ts-expect-error the orb has no mouth to tune
      <RealtimeAvatar key="2" variant="orb" maxMouthOpening={50} />,
      // @ts-expect-error vrm needs its model URL
      <RealtimeAvatar key="3" variant="vrm" />,
      // @ts-expect-error a preset draws its own face, so no children
      <RealtimeAvatar key="4" variant="memoji"><Face /></RealtimeAvatar>,
      // @ts-expect-error customization only recolors the flat presets
      <RealtimeAvatar key="5" variant="glb" glbUrl="/a.glb" customization={{ skinColor: '#000' }} />,
      // @ts-expect-error DiceBear faces don't follow the pointer
      <RealtimeAvatar key="6" variant="dicebear" mouseTrackingIntensity={1} />,
      // @ts-expect-error the seed belongs to variant="dicebear"
      <RealtimeAvatar key="7" variant="geometric" dicebearSeed="x" />,
      // @ts-expect-error the orb can't take mouth tuning, so neither can a variant that may be the orb
      <RealtimeAvatar key="8" variant={picked} maxMouthOpening={50} />,
    ];
    expect(rejected).toHaveLength(8);
  });

  it('still renders a preset by default', () => {
    expect(renderToStaticMarkup(<RealtimeAvatar />)).toContain('data-state="idle"');
  });
});
