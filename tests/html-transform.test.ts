import { describe, expect, it } from 'vitest';
import { htmlToStructuredDocument } from '../electron/services/html-transform';

describe('htmlToStructuredDocument', () => {
  it('extracts paragraphs, tables, and image placeholders', () => {
    const html = `
      <article>
        <h1>Title</h1>
        <p>First paragraph.</p>
        <table>
          <tr><th>Col A</th><th>Col B</th></tr>
          <tr><td>1</td><td>2</td></tr>
        </table>
        <img src="https://example.com/media/hero-image.png" alt="Hero image" />
      </article>
    `;

    const document = htmlToStructuredDocument(html);

    expect(document.blocks).toEqual([
      { kind: 'paragraph', text: 'Title' },
      { kind: 'paragraph', text: 'First paragraph.' },
      {
        kind: 'table',
        rows: [
          ['Col A', 'Col B'],
          ['1', '2'],
        ],
      },
      { kind: 'image', token: '{image:Hero image}' },
    ]);

    expect(document.plainText).toContain('[TABLE 1]');
    expect(document.plainText).toContain('| Col A | Col B |');
    expect(document.plainText).toContain('{image:Hero image}');
  });
});
