import { test, expect, type Page } from '@playwright/test';

type Props = Record<string, string | number | boolean | Record<string, string>>;

async function open(page: Page, scene: string, props: Props = {}) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`/?scene=${scene}&props=${encodeURIComponent(JSON.stringify(props))}`);
  await page.waitForFunction(() => 'rra' in window);
  return errors;
}

const setProps = (page: Page, props: Props) => page.evaluate((p) => window.rra.set(p), props);

/** Stream text into the speech activity for `ms`, like a token stream. */
async function stream(page: Page, ms: number) {
  await page.evaluate(async (duration) => {
    const until = performance.now() + duration;
    while (performance.now() < until) {
      window.rra.push('hola qué tal ');
      await new Promise((r) => setTimeout(r, 40));
    }
  }, ms);
}

/** Sample a numeric attribute for `ms` and return every value seen. */
async function sample(page: Page, selector: string, attr: string, ms: number): Promise<number[]> {
  return page.evaluate(
    async ({ selector, attr, ms }) => {
      const seen: number[] = [];
      const until = performance.now() + ms;
      while (performance.now() < until) {
        const el = document.querySelector(selector);
        if (el) seen.push(Number(el.getAttribute(attr) ?? 'NaN'));
        await new Promise((r) => requestAnimationFrame(r));
      }
      return seen;
    },
    { selector, attr, ms },
  );
}

/** The mouth's openness: `ry` on an ellipse mouth, `height` on a rect. */
async function mouthAttr(page: Page): Promise<string> {
  return page.locator('#rra-mouth').first().evaluate((el) => (el.tagName === 'rect' ? 'height' : 'ry'));
}

test.describe('contract runtime (geometric preset)', () => {
  test('blinks on its own', async ({ page }) => {
    const errors = await open(page, 'realtime');
    // The first blink comes 1.5–3.5 s in; later ones follow blinkInterval*.
    const lids = await sample(page, '.rra-lid', 'height', 4500);
    expect(Math.max(...lids)).toBeGreaterThan(0);
    expect(lids.at(-1)).toBeGreaterThanOrEqual(0);
    expect(errors).toEqual([]);
  });

  test('keeps the mouth closed while idle and opens it while speaking', async ({ page }) => {
    await open(page, 'realtime');
    const attr = await mouthAttr(page);
    const resting = await sample(page, '#rra-mouth', attr, 400);
    const rest = Math.max(...resting);
    expect(Math.min(...resting)).toBe(rest);

    await setProps(page, { state: 'speaking' });
    const [talking] = await Promise.all([sample(page, '#rra-mouth', attr, 1000), stream(page, 1000)]);
    expect(Math.max(...talking)).toBeGreaterThan(rest * 1.5);
  });

  test('closes the mouth again after the stream goes quiet', async ({ page }) => {
    await open(page, 'realtime', { state: 'speaking' });
    const attr = await mouthAttr(page);
    await stream(page, 500);
    await setProps(page, { state: 'idle' });
    await page.waitForTimeout(400);
    const after = await sample(page, '#rra-mouth', attr, 300);
    expect(Math.max(...after) - Math.min(...after)).toBeLessThan(0.01);
  });

  test('shows the thought bubble only while thinking', async ({ page }) => {
    await open(page, 'realtime');
    await expect(page.locator('#rra-think')).toHaveAttribute('opacity', '0');
    await setProps(page, { state: 'thinking' });
    await expect.poll(async () => Number(await page.locator('#rra-think').getAttribute('opacity'))).toBeGreaterThan(0.5);
  });

  test('tints the ring with the state color', async ({ page }) => {
    await open(page, 'byos', { state: 'working', stateColors: { working: '#123456' } });
    await expect(page.locator('#rra-ring')).toHaveAttribute('stroke', '#123456');
    await setProps(page, { state: 'listening' });
    await expect(page.locator('#rra-ring')).toHaveAttribute('stroke', '#3b82f6');
  });

  test('drives a host SVG through the contract', async ({ page }) => {
    await open(page, 'byos', { state: 'speaking' });
    const [talking] = await Promise.all([sample(page, '#rra-mouth', 'ry', 800), stream(page, 800)]);
    expect(Math.max(...talking)).toBeGreaterThan(2);
  });

  test('follows the pointer with its eyes', async ({ page }) => {
    await open(page, 'realtime', { state: 'idle' });
    const pupil = page.locator('.rra-pupil').first();
    const attr = await pupil.evaluate((el) => (el.tagName === 'rect' ? 'x' : 'cx'));
    await page.mouse.move(0, 300);
    await page.waitForTimeout(500);
    const left = Number(await pupil.getAttribute(attr));
    await page.mouse.move(1200, 300);
    await page.waitForTimeout(500);
    const right = Number(await pupil.getAttribute(attr));
    expect(right).toBeGreaterThan(left);
  });
});

test.describe('reduced motion', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('does not blink or track, but still talks', async ({ page }) => {
    await open(page, 'realtime');
    const lids = await sample(page, '.rra-lid', 'height', 4000);
    expect(Math.max(...lids)).toBe(0);

    await setProps(page, { state: 'speaking' });
    const attr = await mouthAttr(page);
    const [talking] = await Promise.all([sample(page, '#rra-mouth', attr, 800), stream(page, 800)]);
    expect(Math.max(...talking)).toBeGreaterThan(Math.min(...talking));
  });

  test('holds the orb still', async ({ page }) => {
    await open(page, 'realtime', { variant: 'orb', state: 'thinking' });
    const body = page.locator('[data-orb-body]');
    const transform = () => body.evaluate((el) => getComputedStyle(el).transform);
    await expect.poll(transform).toBe('matrix(1, 0, 0, 1, 0, 0)');
    await page.waitForTimeout(300);
    expect(await transform()).toBe('matrix(1, 0, 0, 1, 0, 0)');
  });
});

test.describe('overlays', () => {
  test('announces state changes in the pill', async ({ page }) => {
    await open(page, 'realtime', { stateLabels: { listening: 'Escuchando' } });
    const pill = page.getByRole('status').filter({ hasText: /idle|escuchando|working/i });
    await expect(pill).toHaveText('Idle');
    await setProps(page, { state: 'listening' });
    await expect(pill).toHaveText('Escuchando');
    await setProps(page, { state: 'working', tool: 'search_web' });
    await expect(pill).toHaveText('Working: search_web');
  });

  test('names the avatar for assistive tech', async ({ page }) => {
    await open(page, 'realtime', { label: 'Asistente', state: 'speaking' });
    await expect(page.getByRole('img', { name: 'Asistente (Speaking)' })).toBeVisible();
  });

  test('sizes the emoji bubble from a CSS-length size', async ({ page }) => {
    await open(page, 'realtime', { size: '300px', state: 'thinking', thinkingEmojis: true });
    const box = await page.locator('.rra-avatar').boundingBox();
    expect(box?.width).toBe(300);
    expect(box?.height).toBe(300);
    // 28% of the measured 300 px
    await expect(page.locator('.rra-thought-emoji > div')).toHaveCSS('width', '84px');
  });

  test('cycles the thinking emojis', async ({ page }) => {
    await open(page, 'realtime', { state: 'thinking', thinkingEmojis: true, thinkingEmojiInterval: 200 });
    const glyph = page.locator('.rra-thought-emoji span').last();
    const first = await glyph.textContent();
    await expect.poll(() => glyph.textContent()).not.toBe(first);
  });
});

test.describe('byos character', () => {
  test('follows the avatar state without a second state prop', async ({ page }) => {
    await open(page, 'squirrel');
    await expect(page.locator('#rra-thinking-hand')).toHaveCount(0);
    await setProps(page, { state: 'thinking' });
    await expect(page.locator('#rra-thinking-hand')).toHaveCount(1);
  });

  test('animates its mouth through the contract', async ({ page }) => {
    await open(page, 'squirrel', { state: 'speaking' });
    const [talking] = await Promise.all([sample(page, '#rra-mouth', 'ry', 800), stream(page, 800)]);
    expect(Math.max(...talking)).toBeGreaterThan(Math.min(...talking));
  });
});

test.describe('orb', () => {
  const scale = (page: Page) =>
    page.locator('[data-orb-body]').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);

  test('swells with the voice while speaking', async ({ page }) => {
    await open(page, 'realtime', { variant: 'orb', state: 'speaking' });
    const seen: number[] = [];
    await Promise.all([
      stream(page, 1000),
      (async () => {
        for (let i = 0; i < 20; i++) {
          seen.push(await scale(page));
          await page.waitForTimeout(50);
        }
      })(),
    ]);
    expect(Math.max(...seen)).toBeGreaterThan(1.02);
  });

  test('spins a ring only while working', async ({ page }) => {
    await open(page, 'realtime', { variant: 'orb', state: 'thinking' });
    await expect(page.locator('[data-orb-ring]')).toHaveCount(0);
    await setProps(page, { state: 'working' });
    await expect(page.locator('[data-orb-ring]')).toBeVisible();
  });

  test('takes the state color', async ({ page }) => {
    await open(page, 'realtime', { variant: 'orb', state: 'listening', stateColors: { listening: '#ff0000' } });
    await expect(page.locator('[data-orb-body]')).toHaveCSS('background-color', 'rgb(255, 0, 0)');
  });
});

test.describe('VideoAvatar', () => {
  const visible = (page: Page) =>
    page.locator('video[data-clip]').evaluateAll((videos) =>
      videos.filter((v) => (v as HTMLVideoElement).style.opacity === '1').map((v) => v.getAttribute('data-clip')),
    );

  test('crossfades to the clip for the new state', async ({ page }) => {
    await open(page, 'video');
    await expect.poll(() => visible(page)).toEqual(['idle']);
    await setProps(page, { state: 'thinking' });
    await expect.poll(() => visible(page)).toEqual(['thinking']);
    // working has no clip of its own: it falls back to thinking
    await setProps(page, { state: 'working' });
    await page.waitForTimeout(200);
    expect(await visible(page)).toEqual(['thinking']);
  });

  test('shows the speaking clip only while speech flows', async ({ page }) => {
    await open(page, 'video', { state: 'speaking' });
    await stream(page, 300);
    await expect.poll(() => visible(page)).toEqual(['speaking']);
    // Real pause: the speaking clip yields to idle.
    await expect.poll(() => visible(page), { timeout: 3000 }).toEqual(['idle']);
  });

  test('clips the footage to the radius given to the frame', async ({ page }) => {
    await open(page, 'video', { style: { borderRadius: '50%' } });
    await expect(page.locator('[data-clips]')).toHaveCSS('border-radius', '50%');
    await expect(page.locator('[data-clips]')).toHaveCSS('overflow', 'hidden');
  });

  test('has the same overlays as RealtimeAvatar', async ({ page }) => {
    await open(page, 'video', { state: 'working', tool: 'deploy', subtitle: 'Listo **ya**' });
    await expect(page.getByRole('status').filter({ hasText: 'Working: deploy' })).toBeVisible();
    await expect(page.getByText('Listo ya')).toBeVisible();
  });
});
