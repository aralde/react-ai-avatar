/**
 * 05 · The avatar catalog — switching variants.
 *
 * Every built-in flat preset is original, MIT, CC0-safe (no attribution).
 * They all share the same animation runtime, so the only thing that changes is
 * `variant`. `dicebear` is included here too — it's generated client-side from a
 * curated CC0 style set and needs its optional peers installed.
 *
 * Run: npm install react-ai-avatar motion
 *      # for the dicebear option: npm install @dicebear/core @dicebear/collection
 */
import { useState } from 'react';
import { RealtimeAvatar } from 'react-ai-avatar';
import 'react-ai-avatar/style.css';

const FLAT = ['geometric', 'memoji', 'pixelart', 'doodle'] as const;

export default function AvatarCatalog() {
  const [variant, setVariant] = useState<(typeof FLAT)[number] | 'dicebear'>('geometric');

  return (
    <div style={{ display: 'grid', gap: 16, justifyItems: 'center' }}>
      {/* `speaking` with no analyser uses the synthetic mouth, so every preset
          visibly talks here without any audio wiring. */}
      <RealtimeAvatar
        state="speaking"
        variant={variant}
        dicebearCollection="open-peeps"
        dicebearSeed="ada-lovelace"
      />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[...FLAT, 'dicebear' as const].map((v) => (
          <button
            key={v}
            onClick={() => setVariant(v)}
            aria-pressed={variant === v}
            style={{ fontWeight: variant === v ? 700 : 400 }}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
