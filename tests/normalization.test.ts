import { describe, expect, it } from 'vitest';
import {
  collapseBlankLines,
  normalizeInlineText,
  normalizeTextMedium,
} from '../electron/services/normalization';

describe('normalizeTextMedium', () => {
  it('normalizes smart punctuation and spacing', () => {
    const input = '“Hello\u00A0world”  — test';
    const output = normalizeTextMedium(input);
    expect(output).toBe('"Hello world" - test');
  });

  it('collapses repeated blank lines', () => {
    const input = 'line 1\n\n\n\nline 2';
    const output = normalizeTextMedium(input);
    expect(output).toBe('line 1\n\nline 2');
  });

  it('removes replacement and hidden control characters', () => {
    const input = `A\uFFFD\u200E\u0007B`;
    const output = normalizeTextMedium(input);
    expect(output).toBe('AB');
  });
});

describe('normalizeInlineText', () => {
  it('turns multiline text into a single line', () => {
    expect(normalizeInlineText('A\nB\nC')).toBe('A B C');
  });
});

describe('collapseBlankLines', () => {
  it('removes leading, trailing, and repeated blank lines', () => {
    expect(collapseBlankLines(['', '', 'line', '', '', 'line2', ''])).toEqual(['line', '', 'line2']);
  });
});
