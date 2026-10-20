/**
 * 12 · A video avatar: the "clip" technique (`VideoAvatar`).
 *
 * Every other example draws a face. This one plays footage: one short looping video
 * per state (generated with a text-to-video model, or recorded), crossfaded when the
 * state changes. The trick that makes it seamless is a shared "hub" frame — every
 * clip starts and ends on the same neutral pose, so loops and cuts don't jump.
 *
 * - Lip-sync is gated, not phoneme-accurate: with `speechActivity` (or `analyser`)
 *   the speaking clip only shows while there's actual speech, and falls back to the
 *   idle clip in pauses.
 * - `idleVariations` play one-shot clips now and then while idle (a hand on the chin;
 *   a sip of coffee, only after a long wait) so idle isn't the same loop forever.
 * - An agent that flips thinking ↔ working on every tool call doesn't make the face
 *   flicker: short bursts are ignored, only a long-running tool shows `working`.
 *
 * The package ships no footage. These URLs point at the sample clips hosted on the
 * docs site; swap them for your own. To turn a raw video into a clip (square crop,
 * silent, seamless loop, WebM + MP4), see `scripts/prepare-video-clips.ts`.
 *
 * Run: npm install react-ai-avatar
 */
import { useRef, useState } from 'react';
import { VideoAvatar, createSpeechActivity } from 'react-ai-avatar';
import type { AvatarState, IdleVariation, VideoClips } from 'react-ai-avatar';
import 'react-ai-avatar/style.css';

const CLIP_BASE = 'https://react-ai-avatar.vercel.app/clips';
const clip = (name: string) => ({ webm: `${CLIP_BASE}/${name}.webm`, mp4: `${CLIP_BASE}/${name}.mp4` });

// Module constants: VideoAvatar restarts its idle timer if these change identity.
const CLIPS: VideoClips = {
  idle: clip('idle'),
  listening: clip('listening'),
  thinking: clip('thinking'),
  working: clip('working'),
  speaking: clip('speaking'),
};
const IDLE_VARIATIONS: IdleVariation[] = [
  { clip: clip('idle-chin'), cooldownMs: 60_000 },
  { clip: clip('idle-coffee'), afterIdleMs: 90_000, cooldownMs: 300_000 },
];

const STATES: AvatarState[] = ['idle', 'listening', 'thinking', 'working', 'speaking'];
const REPLY = 'Sure. I checked the repo, fixed two failing tests... and left a note about the bundle size.';

export default function VideoAvatarExample() {
  const speech = useRef(createSpeechActivity()).current;
  const [state, setState] = useState<AvatarState>('idle');

  async function speak() {
    setState('speaking');
    // Stand-in for a streamed LLM reply: push each chunk as it arrives.
    for (const word of REPLY.split(' ')) {
      speech.push(word + ' ');
      await new Promise((r) => setTimeout(r, word.endsWith('...') ? 1200 : 120));
    }
    speech.end();
    setState('idle');
  }

  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 16 }}>
      <VideoAvatar
        clips={CLIPS}
        state={state}
        speechActivity={speech}
        idleVariations={IDLE_VARIATIONS}
        poster={`${CLIP_BASE}/poster.jpg`}
        size={320}
        label="Assistant"
        style={{ borderRadius: '50%' }}
      />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {STATES.map((s) => (
          <button key={s} aria-pressed={s === state} onClick={() => setState(s)}>
            {s}
          </button>
        ))}
        <button onClick={speak}>▶ speak a reply</button>
      </div>
    </div>
  );
}
