import type { Block, StructuredDocument } from '../../src/shared/compare';
import { collapseBlankLines, normalizeInlineText } from './normalization';

export function serializeBlocks(blocks: Block[]): string {
  const lines: string[] = [];
  let tableIndex = 0;

  for (const block of blocks) {
    if (lines.length > 0 && lines.at(-1) !== '') {
      lines.push('');
    }

    if (block.kind === 'paragraph') {
      const paragraph = normalizeInlineText(block.text);
      if (paragraph) {
        lines.push(paragraph);
      }
      continue;
    }

    if (block.kind === 'table') {
      tableIndex += 1;
      lines.push(`[TABLE ${tableIndex}]`);
      for (const row of block.rows) {
        const normalizedCells = row.map((cell) => normalizeInlineText(cell));
        lines.push(`| ${normalizedCells.join(' | ')} |`);
      }
      continue;
    }

    if (block.kind === 'image') {
      lines.push(block.token);
    }
  }

  return collapseBlankLines(lines).join('\n');
}

export function toStructuredDocument(blocks: Block[]): StructuredDocument {
  return {
    blocks,
    plainText: serializeBlocks(blocks),
  };
}
