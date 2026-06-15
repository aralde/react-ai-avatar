import { describe, it, expect } from 'vitest';
import { parseModelText } from './useGeminiLive';

describe('parseModelText', () => {
  it('should parse complete thought and speech tags', () => {
    const input = '<thought>This is my reasoning.</thought><speech>Hello, world!</speech>';
    const result = parseModelText(input);
    expect(result).toEqual({
      thought: 'This is my reasoning.',
      speech: 'Hello, world!'
    });
  });

  it('should handle streaming thought tag before it closes', () => {
    const input = '<thought>Still thinking about what to say';
    const result = parseModelText(input);
    expect(result).toEqual({
      thought: 'Still thinking about what to say',
      speech: ''
    });
  });

  it('should handle streaming speech tag before it closes', () => {
    const input = '<thought>Done thinking.</thought><speech>Hello, how can I';
    const result = parseModelText(input);
    expect(result).toEqual({
      thought: 'Done thinking.',
      speech: 'Hello, how can I'
    });
  });

  it('should fallback and return speech if no tags are present', () => {
    const input = 'Hello, this has no tags.';
    const result = parseModelText(input);
    expect(result).toEqual({
      thought: '',
      speech: 'Hello, this has no tags.'
    });
  });

  it('should strip trailing partial tags or stray XML symbols', () => {
    const input1 = '<thought>Thinking</thought><speech>Hello</s';
    expect(parseModelText(input1)).toEqual({
      thought: 'Thinking',
      speech: 'Hello'
    });

    const input2 = '<thought>Thinking</thought><speech>Hello</sp';
    expect(parseModelText(input2)).toEqual({
      thought: 'Thinking',
      speech: 'Hello'
    });

    const input3 = '<thought>Thinking</thought><speech>Hello<';
    expect(parseModelText(input3)).toEqual({
      thought: 'Thinking',
      speech: 'Hello'
    });
  });

  it('should strip leading blockquotes/greater-than symbols', () => {
    const input = '<thought>> Thinking...</thought><speech>> Hello!</speech>';
    const result = parseModelText(input);
    expect(result).toEqual({
      thought: 'Thinking...',
      speech: 'Hello!'
    });
  });

  it('should clean up bold labels like **Thinking**', () => {
    const input = '<thought>**Thinking** Need to greet user</thought><speech>Hi!</speech>';
    const result = parseModelText(input);
    expect(result).toEqual({
      thought: 'Thinking: Need to greet user',
      speech: 'Hi!'
    });
  });
});
