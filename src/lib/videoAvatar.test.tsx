import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { VideoAvatar } from '../components/VideoAvatar';
import type { IdleVariation, VideoClips } from './videoClips';

const CLIPS: VideoClips = {
  idle: { webm: '/idle.webm', mp4: '/idle.mp4' },
  thinking: '/thinking.mp4',
};
const VARIATIONS: IdleVariation[] = [{ clip: '/coffee.mp4', afterIdleMs: 30_000 }];

function render(props: Partial<Parameters<typeof VideoAvatar>[0]> = {}) {
  const html = renderToStaticMarkup(<VideoAvatar clips={CLIPS} idleVariations={VARIATIONS} {...props} />);
  return new Markup(html);
}

/** Tiny attribute reader over the static markup (tests run without a DOM). */
class Markup {
  constructor(readonly html: string) {}
  videoTag(clip: string) {
    const match = this.html.match(new RegExp(`<video[^>]*data-clip="${clip}"[^>]*>`));
    if (!match) throw new Error(`no <video> for ${clip}`);
    return match[0];
  }
  videoBody(clip: string) {
    const start = this.html.indexOf(this.videoTag(clip));
    return this.html.slice(start, this.html.indexOf('</video>', start));
  }
}

describe('VideoAvatar markup', () => {
  it('renders one video per clip plus one per idle variation', () => {
    const { html } = render();
    expect(html.match(/<video/g)).toHaveLength(3);
  });

  it('shows only the clip resolved for the state', () => {
    const page = render({ state: 'working' });
    expect(page.videoTag('thinking')).toContain('opacity:1');
    expect(page.videoTag('idle')).toContain('opacity:0');
    expect(page.videoTag('idle-variation-0')).toContain('opacity:0');
  });

  it('loops state clips but plays variations once', () => {
    const page = render();
    expect(page.videoTag('idle')).toMatch(/\sloop[\s=>]/);
    expect(page.videoTag('idle-variation-0')).not.toMatch(/\sloop[\s=>]/);
  });

  it('offers WebM before MP4', () => {
    const body = render().videoBody('idle');
    expect(body.indexOf('/idle.webm')).toBeGreaterThan(-1);
    expect(body.indexOf('/idle.webm')).toBeLessThan(body.indexOf('/idle.mp4'));
  });

  it('names the avatar and its state for assistive tech', () => {
    const { html } = render({ state: 'thinking', label: 'Ariel' });
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Ariel (thinking)"');
    expect(html.match(/<video[^>]*aria-hidden="true"/g)).toHaveLength(3);
  });
});
