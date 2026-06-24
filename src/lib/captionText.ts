/**
 * Caption text helpers.
 *
 * An LLM reply is usually rich markdown — headings, bold, tables, lists. That
 * reads fine in a chat transcript, but a *caption* under a talking face wants
 * short, clean, spoken prose: the line being said right now, not the whole
 * document with `**` and `| col |` showing through.
 *
 * These two pure helpers do exactly that, and nothing else (no React, no DOM):
 * - `toPlainText` flattens markdown to readable text.
 * - `tailWindow` keeps only the trailing slice, cut on a word/sentence boundary,
 *   so a caption tracks the end of a growing stream instead of overflowing.
 *
 * The library stays presentational: you bring the text, these shape it.
 */

/**
 * Flatten markdown / rich text to plain spoken prose.
 *
 * Drops table rows entirely (they don't read aloud), strips emphasis,
 * heading, link and code syntax, and collapses whitespace. Tolerant of the
 * *partial* markdown you get mid-stream (an unmatched `**`, a half-typed link).
 */
export function toPlainText(input: string): string {
  if (!input) return '';
  let text = input;

  // Fenced code blocks -> keep the inner code as plain lines, drop the fences.
  text = text.replace(/```[^\n]*\n?([\s\S]*?)```/g, '$1');
  text = text.replace(/```[^\n]*\n?/g, ''); // unclosed fence still streaming: drop the opener line, keep the code

  // Drop markdown table rows wholesale — they never read well as a caption.
  text = text
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;
      // A table row is a line that starts and (roughly) ends with a pipe,
      // or a separator row like |---|:--:|.
      const isRow = /^\|.*\|?\s*$/.test(t) && t.includes('|');
      const isSep = /^\|?[\s:|-]+\|[\s:|-]*$/.test(t) && t.includes('-');
      return !(isRow || isSep);
    })
    .join('\n');

  // Images ![alt](url) -> alt ; links [text](url) -> text
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

  // Inline code `x` -> x
  text = text.replace(/`([^`]+)`/g, '$1');

  // Headings, blockquotes, list markers at line start.
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, '');
  text = text.replace(/^\s{0,3}>\s?/gm, '');
  text = text.replace(/^\s{0,3}[-*+]\s+/gm, '');
  text = text.replace(/^\s{0,3}\d+\.\s+/gm, '');

  // Emphasis: **bold**, *italic*, __x__, _x_, ~~strike~~. Run twice so
  // nested/adjacent markers (***x***) clear fully; tolerate dangling markers.
  for (let i = 0; i < 2; i++) {
    text = text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/~~([^~]+)~~/g, '$1');
  }
  // Strip any leftover dangling emphasis markers from a half-streamed chunk.
  text = text.replace(/[*_~]{1,3}(?=\s|$)/g, '').replace(/(^|\s)[*_~]{1,3}/g, '$1');

  // Horizontal rules.
  text = text.replace(/^\s{0,3}([-*_])\1{2,}\s*$/gm, '');

  // Collapse whitespace: blank-line runs -> single space, then squeeze.
  text = text.replace(/\s*\n\s*/g, ' ').replace(/[ \t]{2,}/g, ' ');

  return text.trim();
}

export interface TailWindowOptions {
  /** Hard upper bound on returned length. Default 160. */
  maxChars?: number;
}

/**
 * Keep only the trailing window of `text`, so a caption tracks the end of a
 * growing stream. Prefers to cut on a sentence boundary, falls back to a word
 * boundary, and prefixes an ellipsis when text was dropped from the front.
 */
export function tailWindow(text: string, options: TailWindowOptions = {}): string {
  const maxChars = options.maxChars ?? 160;
  const t = text.trim();
  if (t.length <= maxChars) return t;

  const tail = t.slice(t.length - maxChars);

  // Prefer starting after the first sentence end inside the window, so we
  // begin on a clean sentence rather than mid-word.
  const sentence = tail.search(/(?<=[.!?…])\s+/);
  if (sentence !== -1 && sentence < maxChars * 0.6) {
    return '…' + tail.slice(sentence).trimStart();
  }

  // Otherwise cut on the first word boundary.
  const space = tail.indexOf(' ');
  const start = space === -1 ? 0 : space + 1;
  return '…' + tail.slice(start);
}
