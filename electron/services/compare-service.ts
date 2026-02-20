import type { CompareRequest, CompareResponse, StructuredDocument } from '../../src/shared/compare';
import { DEFAULT_COMPARE_OPTIONS } from '../../src/shared/compare';
import { extractDocxDocument } from './docx-extractor';
import { CompareServiceError } from './errors';
import { extractWebsiteDocument } from './web-extractor';

export async function runComparison(request: CompareRequest): Promise<CompareResponse> {
  validateCompareRequest(request);
  const options = { ...DEFAULT_COMPARE_OPTIONS, ...request.options };

  if (
    options.pageScope !== 'main-article' ||
    options.normalization !== 'medium' ||
    options.imageMode !== 'placeholder' ||
    options.tableMode !== 'cell-by-position'
  ) {
    throw new CompareServiceError('EXTRACTION_FAILED', 'Unsupported comparison options were provided.');
  }

  const [website, document] = await Promise.all([
    extractWebsiteDocument(request.pageUrl),
    extractDocxDocument(request.docPath),
  ]);

  const leftStats = buildSideStats(website.document);
  const rightStats = buildSideStats(document.document);

  return {
    leftLabel: 'Website',
    rightLabel: 'Document',
    leftText: website.document.plainText,
    rightText: document.document.plainText,
    stats: {
      leftChars: leftStats.chars,
      rightChars: rightStats.chars,
      leftBlocks: leftStats.blocks,
      rightBlocks: rightStats.blocks,
      leftImages: leftStats.images,
      rightImages: rightStats.images,
      leftTables: leftStats.tables,
      rightTables: rightStats.tables,
    },
    warnings: [...website.warnings, ...document.warnings],
  };
}

function validateCompareRequest(request: CompareRequest): void {
  if (!request.docPath?.trim()) {
    throw new CompareServiceError('DOCX_PARSE_FAILED', 'A DOCX file path is required.');
  }

  if (!request.pageUrl?.trim()) {
    throw new CompareServiceError('INVALID_URL', 'A website URL is required.');
  }
}

function buildSideStats(document: StructuredDocument): {
  chars: number;
  blocks: number;
  images: number;
  tables: number;
} {
  return {
    chars: document.plainText.length,
    blocks: document.blocks.length,
    images: document.blocks.filter((block) => block.kind === 'image').length,
    tables: document.blocks.filter((block) => block.kind === 'table').length,
  };
}
