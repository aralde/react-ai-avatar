/**
 * Split a streaming model reply into `{ thought, speech }`.
 *
 * The example prompts wrap the model's reasoning in `<thought>…</thought>` and
 * its spoken answer in `<speech>…</speech>` (see `server/proxy.ts`). This parser
 * is tolerant of *partial* input: call it on the accumulated text after every
 * chunk and it hides half-typed tags, so subtitles never flicker `<spe` at the
 * user.
 *
 * If your model doesn't use these tags, you don't need this at all — just feed
 * the raw text to your subtitle and `speech.push()`.
 */
export function parseModelText(raw: string): { thought: string; speech: string } {
  let thought = '';
  let speech = '';
  const text = raw.trim();

  const thoughtStart = text.toLowerCase().indexOf('<thought');
  if (thoughtStart !== -1) {
    const tagEnd = text.indexOf('>', thoughtStart);
    if (tagEnd !== -1) {
      const afterOpen = text.slice(tagEnd + 1);
      const thoughtEnd = afterOpen.toLowerCase().indexOf('</thought>');
      if (thoughtEnd !== -1) {
        thought = afterOpen.slice(0, thoughtEnd).trim();
        speech = extractSpeech(afterOpen.slice(thoughtEnd + 10));
      } else {
        // Thought still streaming, not closed yet.
        const speechStart = afterOpen.toLowerCase().indexOf('<speech');
        thought = (speechStart !== -1 ? afterOpen.slice(0, speechStart) : afterOpen).trim();
        if (speechStart !== -1) speech = extractSpeech(afterOpen.slice(speechStart));
      }
    } else {
      // `<thought` itself is half-typed; hide it.
      speech = text.slice(0, thoughtStart).trim();
    }
  } else {
    speech = extractSpeech(text);
  }

  // Strip trailing partial tags (`<`, `</t`, `<s`, …) so they never show.
  speech = speech.replace(/<\/?[a-zA-Z]*$/g, '').trim();
  thought = thought.replace(/<\/?[a-zA-Z]*$/g, '').trim();
  return { thought, speech };
}

function extractSpeech(segment: string): string {
  const speechStart = segment.toLowerCase().indexOf('<speech');
  if (speechStart === -1) return segment.trim();
  const tagEnd = segment.indexOf('>', speechStart);
  if (tagEnd === -1) return segment.slice(0, speechStart).trim();
  const afterOpen = segment.slice(tagEnd + 1);
  const speechEnd = afterOpen.toLowerCase().indexOf('</speech>');
  return (speechEnd !== -1 ? afterOpen.slice(0, speechEnd) : afterOpen).trim();
}
