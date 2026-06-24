import { describe, it, expect } from 'vitest';
import { toPlainText, tailWindow } from './captionText';

describe('toPlainText', () => {
  it('strips bold and italic emphasis', () => {
    expect(toPlainText('a **bold** and *italic* word')).toBe('a bold and italic word');
    expect(toPlainText('__under__ and _em_ and ***both***')).toBe('under and em and both');
  });

  it('strips headings, list markers and blockquotes', () => {
    expect(toPlainText('### Title')).toBe('Title');
    expect(toPlainText('- one\n- two')).toBe('one two');
    expect(toPlainText('1. first\n2. second')).toBe('first second');
    expect(toPlainText('> quoted')).toBe('quoted');
  });

  it('drops markdown table rows entirely', () => {
    const md = [
      'Here is a plan:',
      '| Section | Description |',
      '| --- | --- |',
      '| Map | live view |',
      'Done.',
    ].join('\n');
    expect(toPlainText(md)).toBe('Here is a plan: Done.');
  });

  it('reduces links and images to their text', () => {
    expect(toPlainText('see [the docs](https://x.y)')).toBe('see the docs');
    expect(toPlainText('![a cat](cat.png) here')).toBe('a cat here');
  });

  it('keeps inline and fenced code as plain text', () => {
    expect(toPlainText('run `npm i` now')).toBe('run npm i now');
    expect(toPlainText('```ts\nconst x = 1;\n```')).toBe('const x = 1;');
  });

  it('collapses whitespace and newlines into single spaces', () => {
    expect(toPlainText('a\n\n\nb   c')).toBe('a b c');
  });

  it('is tolerant of partial mid-stream markdown', () => {
    // half-typed bold and an unclosed code fence should not leak markers
    expect(toPlainText('thinking about **the pl')).toBe('thinking about the pl');
    expect(toPlainText('code:\n```ts\nconst a')).toBe('code: const a');
  });

  it('returns empty string for empty input', () => {
    expect(toPlainText('')).toBe('');
  });
});

describe('tailWindow', () => {
  it('returns text unchanged when within the limit', () => {
    expect(tailWindow('short caption', { maxChars: 160 })).toBe('short caption');
  });

  it('keeps only the trailing slice when over the limit', () => {
    const long = 'word '.repeat(60).trim(); // ~300 chars
    const out = tailWindow(long, { maxChars: 40 });
    expect(out.length).toBeLessThanOrEqual(42); // window + ellipsis
    expect(out.startsWith('…')).toBe(true);
  });

  it('cuts on a word boundary, never mid-word', () => {
    const out = tailWindow('alpha bravo charlie delta echo foxtrot', { maxChars: 20 });
    // first token after the ellipsis must be a whole word from the source
    const firstWord = out.replace(/^…/, '').trim().split(' ')[0];
    expect(['bravo', 'charlie', 'delta', 'echo', 'foxtrot']).toContain(firstWord);
  });

  it('prefers starting after a sentence boundary when one is near the front', () => {
    const text = 'End it. Now a fresh and reasonably long second sentence here';
    const out = tailWindow(text, { maxChars: 54 });
    expect(out).toBe('…Now a fresh and reasonably long second sentence here');
  });
});
