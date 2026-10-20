import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RealtimeAvatar, type RealtimeAvatarProps } from '../components/RealtimeAvatar';
import { VideoAvatar, type VideoAvatarProps } from '../components/VideoAvatar';
import { SquirrelAvatar } from '../components/SquirrelAvatar';
import { useAvatarState } from './avatarState';

const CLIPS = { idle: '/idle.mp4' };

const realtime = (props: RealtimeAvatarProps) => renderToStaticMarkup(<RealtimeAvatar {...props} />);
const video = (props: Partial<VideoAvatarProps>) => renderToStaticMarkup(<VideoAvatar clips={CLIPS} {...props} />);

/** The pill text for a rendered avatar (the `role="status"` element's text). */
function pill(html: string): string | null {
  const match = html.match(/class="rra-state-pill[^"]*"[^>]*><span[^>]*><span[^>]*><\/span>([^<]*)</);
  return match ? match[1] : null;
}

describe('shared overlays', () => {
  it.each([
    ['RealtimeAvatar', realtime],
    ['VideoAvatar', video],
  ] as const)('%s shows the same pill, tool and subtitle', (_, render) => {
    const html = render({ state: 'working', tool: 'search_web', subtitle: 'Hola **mundo**' });
    expect(pill(html)).toBe('Working: search_web');
    expect(html).toContain('Hola mundo');
  });

  it.each([
    ['RealtimeAvatar', realtime],
    ['VideoAvatar', video],
  ] as const)('%s hides each overlay on request', (_, render) => {
    const html = render({ state: 'speaking', subtitle: 'hola', showStatePill: false, showSubtitle: false, showGlow: false });
    expect(pill(html)).toBeNull();
    expect(html).not.toContain('hola');
    expect(html).not.toContain('rra-glow');
  });

  it('localizes the pill', () => {
    expect(pill(realtime({ state: 'listening', stateLabels: { listening: 'Escuchando' } }))).toBe('Escuchando');
  });

  it('marks an overlay bubble so the face hides its own', () => {
    const marked = /class="rra-avatar[^"]*"[^>]*data-overlay-bubble=""|data-overlay-bubble=""[^>]*class="rra-avatar/;
    expect(realtime({ state: 'thinking', thinkingEmojis: true })).toMatch(marked);
    expect(realtime({ state: 'thinking', thought: 'Hmm' })).toMatch(marked);
    expect(realtime({ state: 'thinking' })).not.toContain('data-overlay-bubble');
    expect(realtime({ state: 'idle', thinkingEmojis: true })).not.toContain('data-overlay-bubble');
  });

  it('defaults the state to idle', () => {
    expect(realtime({})).toContain('data-state="idle"');
    expect(video({})).toContain('data-state="idle"');
  });
});

describe('size', () => {
  it('takes px as a number', () => {
    expect(realtime({ size: 120 })).toMatch(/class="rra-avatar[^"]*" style="width:120px;height:120px/);
  });

  it('takes any CSS length as a string, kept square', () => {
    const html = realtime({ size: '50%' });
    expect(html).toMatch(/class="rra-avatar[^"]*" style="width:50%;aspect-ratio:1 \/ 1/);
  });
});

describe('state reaches children (byos)', () => {
  function Probe() {
    return <span data-probe={useAvatarState()} />;
  }

  it('passes state through context', () => {
    expect(realtime({ state: 'thinking', variant: 'byos', children: <Probe /> })).toContain('data-probe="thinking"');
  });

  it('infers byos from children', () => {
    const html = realtime({ state: 'speaking', children: <Probe /> });
    expect(html).toContain('data-probe="speaking"');
    expect(html).not.toContain('rra-geo');
  });

  it('renders a character in its pose without passing state twice', () => {
    expect(realtime({ state: 'thinking', children: <SquirrelAvatar poses /> })).toContain('id="rra-thinking-hand"');
  });

  it('lets an explicit prop win over the context', () => {
    expect(realtime({ state: 'thinking', children: <SquirrelAvatar state="idle" poses /> })).not.toContain(
      'id="rra-thinking-hand"',
    );
  });
});

describe('orb', () => {
  it('renders as a variant inside the frame', () => {
    const html = realtime({ variant: 'orb', state: 'working' });
    expect(html).toContain('data-orb=""');
    expect(html).toContain('data-orb-ring=""');
    expect(pill(html)).toBe('Working');
  });

  it('only shows the working ring while working', () => {
    expect(realtime({ variant: 'orb', state: 'idle' })).not.toContain('data-orb-ring');
  });

  it('tints with the state color', () => {
    expect(realtime({ variant: 'orb', state: 'speaking', stateColors: { speaking: '#ff0000' } })).toContain(
      'background-color:#ff0000',
    );
  });
});
