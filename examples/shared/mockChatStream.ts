/**
 * Client-side mock of a text-streaming LLM.
 *
 * This is the no-backend, no-API-key port of the demo server's `streamMockChat`
 * (see `server.ts` in the repo root). It replays a small set of canned replies,
 * emitted a few characters at a time on a timer — exactly the cadence a real
 * `/chat/completions` SSE stream produces. Use it to drive the avatar's mouth in
 * examples and docs without wiring up any model.
 *
 * The replies follow the same `<thought>…</thought><speech>…</speech>` convention
 * the demo uses, so `parseModelText()` (in this folder) can split them.
 */

const MOCK_RESPONSES = [
  '<thought>El usuario se ha conectado. Genero un saludo y un cuento corto sobre un robot.</thought>' +
    '<speech>¡Hola! Te voy a contar una historia de cinco líneas. ' +
    'Había una vez un pequeño robot de silicio. ' +
    'Soñaba con ver las estrellas de cerca. ' +
    'Cada noche, apuntaba su antena hacia el cielo. ' +
    'Un día, una estrella fugaz le respondió. ' +
    'Y en ese instante supo que no estaba solo en el universo.</speech>',

  '<thought>Genero una historia sobre una pequeña nube.</thought>' +
    '<speech>¡Qué interesante! Aquí va otra historia corta. ' +
    'Una nube de algodón flotaba muy alto en el cielo. ' +
    'Cansada de ser blanca, salió a buscar colores. ' +
    'Voló cerca de un arcoíris y se tiñó de rosa y violeta. ' +
    'Al atardecer, llovió confeti sobre el valle. ' +
    'Y desde entonces los campos florecen de alegría.</speech>',

  '<thought>Genero una historia poética sobre un faro.</thought>' +
    '<speech>¡Me encanta seguir charlando! Escuchá esto. ' +
    'En un acantilado remoto, un viejo faro guiaba a los barcos. ' +
    'Cada noche brillaba con fuerza, sintiéndose solo en el mar. ' +
    'Una noche de tormenta, una estrella cayó en su cúpula. ' +
    'Juntos iluminaron el océano con destellos plateados. ' +
    'Y ningún marinero volvió a perderse.</speech>',
];

export interface MockStreamOptions {
  /** Characters emitted per tick. Default 3 (same as the demo server). */
  chunkSize?: number;
  /** Milliseconds between ticks. Default 35. */
  intervalMs?: number;
  /** Pick a specific reply; otherwise replies rotate per call. */
  index?: number;
}

let rotation = 0;

/**
 * Stream one canned reply, a few characters at a time, as an async iterable.
 * Cancel by `break`ing out of the `for await` loop — the timer stops on the
 * next tick.
 *
 * ```ts
 * for await (const chunk of mockChatStream()) {
 *   speech.push(chunk);      // feed token cadence to the mouth
 *   accumulated += chunk;    // your subtitle / parsing
 * }
 * ```
 */
export async function* mockChatStream(
  options: MockStreamOptions = {}
): AsyncGenerator<string, void, unknown> {
  const { chunkSize = 3, intervalMs = 35 } = options;
  const text =
    MOCK_RESPONSES[(options.index ?? rotation++) % MOCK_RESPONSES.length];

  for (let i = 0; i < text.length; i += chunkSize) {
    yield text.slice(i, i + chunkSize);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

export { MOCK_RESPONSES };
