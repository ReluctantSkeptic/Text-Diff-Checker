import { describe, expect, it } from 'vitest';
import { parsePublicHttpUrl, selectMainContentHtml } from '../electron/services/web-extractor';

describe('parsePublicHttpUrl', () => {
  it('accepts http and https URLs', () => {
    expect(parsePublicHttpUrl('https://example.com').protocol).toBe('https:');
    expect(parsePublicHttpUrl('http://example.com').protocol).toBe('http:');
  });

  it('rejects unsupported URL protocols', () => {
    expect(() => parsePublicHttpUrl('file:///tmp/doc')).toThrowError('Only http/https URLs are supported.');
  });
});

describe('selectMainContentHtml', () => {
  it('uses readability when content is long enough', () => {
    const selection = selectMainContentHtml({
      rawHtml: '<html><body><main>Body content</main></body></html>',
      readabilityHtml: `<article><p>${'a'.repeat(130)}</p></article>`,
      readabilityTextLength: 130,
    });

    expect(selection.source).toBe('readability');
    expect(selection.warnings).toHaveLength(0);
  });

  it('falls back to main when readability is sparse', () => {
    const selection = selectMainContentHtml({
      rawHtml: '<html><body><main><p>Main article block with enough text for fallback extraction.</p></main></body></html>',
      readabilityHtml: '<article><p>short</p></article>',
      readabilityTextLength: 5,
    });

    expect(selection.source).toBe('main');
    expect(selection.warnings.some((warning) => warning.includes('fallback'))).toBe(true);
  });
});
