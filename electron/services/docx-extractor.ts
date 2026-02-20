import path from 'node:path';
import mammoth from 'mammoth';
import type { StructuredDocument } from '../../src/shared/compare';
import { htmlToStructuredDocument } from './html-transform';
import { CompareServiceError } from './errors';

export type ExtractionResult = {
  document: StructuredDocument;
  warnings: string[];
};

export async function extractDocxDocument(docPath: string): Promise<ExtractionResult> {
  if (!docPath.toLowerCase().endsWith('.docx')) {
    throw new CompareServiceError('DOCX_PARSE_FAILED', 'Only .docx files are supported in this version.');
  }

  try {
    const parsed = await mammoth.convertToHtml({ path: docPath });
    const warnings = parsed.messages.map((message) => `DOCX: ${message.message}`);
    const document = htmlToStructuredDocument(parsed.value ?? '');

    if (document.blocks.length === 0) {
      warnings.push(`DOCX "${path.basename(docPath)}" produced no text blocks.`);
    }

    return { document, warnings };
  } catch {
    throw new CompareServiceError(
      'DOCX_PARSE_FAILED',
      `Unable to parse DOCX file "${path.basename(docPath)}".`,
    );
  }
}
