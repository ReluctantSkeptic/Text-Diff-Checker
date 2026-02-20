import { load } from 'cheerio';
import type { AnyNode, Element } from 'domhandler';
import type { Block, StructuredDocument } from '../../src/shared/compare';
import { normalizeInlineText } from './normalization';
import { toStructuredDocument } from './serialization';

const IGNORED_TAGS = new Set([
  'script',
  'style',
  'noscript',
  'template',
  'svg',
  'canvas',
  'iframe',
  'meta',
  'link',
]);

const PARAGRAPH_TAGS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'blockquote',
  'pre',
  'figcaption',
  'dt',
  'dd',
]);

type ParseContext = {
  imageIndex: number;
};

export function htmlToStructuredDocument(html: string): StructuredDocument {
  const blocks = htmlToBlocks(html);
  return toStructuredDocument(blocks);
}

export function htmlToBlocks(html: string): Block[] {
  const $ = load(html);
  const root = $('body').get(0) ?? $.root().get(0);
  if (!root) {
    return [];
  }

  const blocks: Block[] = [];
  const context: ParseContext = { imageIndex: 0 };

  for (const child of root.children) {
    collectBlocks($, child, blocks, context);
  }

  return blocks;
}

function collectBlocks(
  $: ReturnType<typeof load>,
  node: AnyNode,
  blocks: Block[],
  context: ParseContext,
): void {
  if (node.type === 'comment') {
    return;
  }

  if (node.type === 'root') {
    for (const child of node.children) {
      collectBlocks($, child, blocks, context);
    }
    return;
  }

  if (node.type !== 'tag') {
    return;
  }

  const tagName = node.name.toLowerCase();

  if (IGNORED_TAGS.has(tagName)) {
    return;
  }

  if (tagName === 'table') {
    const rows = extractTableRows($, node);
    if (rows.length > 0) {
      blocks.push({ kind: 'table', rows });
    }
    return;
  }

  if (tagName === 'img') {
    context.imageIndex += 1;
    blocks.push({ kind: 'image', token: buildImageToken($, node, context.imageIndex) });
    return;
  }

  if (PARAGRAPH_TAGS.has(tagName)) {
    const paragraphText = normalizeInlineText($(node).text());
    if (paragraphText) {
      blocks.push({ kind: 'paragraph', text: paragraphText });
    }
    return;
  }

  for (const child of node.children) {
    collectBlocks($, child, blocks, context);
  }
}

function extractTableRows($: ReturnType<typeof load>, tableNode: Element): string[][] {
  const rows: string[][] = [];

  $(tableNode)
    .find('tr')
    .each((_, rowNode) => {
      const row: string[] = [];
      $(rowNode)
        .find('th, td')
        .each((__, cellNode) => {
          row.push(normalizeInlineText($(cellNode).text()));
        });

      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
    });

  return rows;
}

function buildImageToken($: ReturnType<typeof load>, node: Element, imageIndex: number): string {
  const alt = normalizeInlineText($(node).attr('alt') ?? '');
  const title = normalizeInlineText($(node).attr('title') ?? '');
  const source = $(node).attr('src') ?? '';
  const filename = extractFileName(source);

  const rawLabel = alt || title || filename || `image-${imageIndex}`;
  const safeLabel = rawLabel.replace(/[{}\n\r|]/g, ' ').replace(/\s+/g, ' ').trim();

  return `{image:${safeLabel || `image-${imageIndex}`}}`;
}

function extractFileName(source: string): string {
  if (!source || source.startsWith('data:')) {
    return '';
  }

  try {
    const parsed = new URL(source, 'https://local.invalid');
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    return pathParts.at(-1) ?? '';
  } catch {
    return source.split('/').at(-1) ?? '';
  }
}
