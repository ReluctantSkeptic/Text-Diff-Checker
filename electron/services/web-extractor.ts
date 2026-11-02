import { Readability } from '@mozilla/readability';
import { load } from 'cheerio';
import { JSDOM } from 'jsdom';
import type { StructuredDocument } from '../../src/shared/compare';
import { htmlToStructuredDocument } from './html-transform';
import { CompareServiceError } from './errors';
import { normalizeInlineText } from './normalization';
import { tryExtractRenderedMainContent } from './rendered-dom-extractor';

const FETCH_TIMEOUT_MS = 15_000;
const FETCH_ATTEMPTS = 3;
const READABILITY_MIN_LENGTH = 120;
const FALLBACK_MIN_LENGTH = 40;

type SelectionSource = 'readability' | 'article' | 'main' | 'body';

export type WebExtractionResult = {
  document: StructuredDocument;
  warnings: string[];
};

export type MainContentSelection = {
  html: string;
  source: SelectionSource;
  warnings: string[];
};

export async function extractWebsiteDocument(pageUrl: string): Promise<WebExtractionResult> {
  const validatedUrl = parsePublicHttpUrl(pageUrl).toString();
  // The rendered-DOM pass doesn't depend on the raw fetch, so start it now and let the two page loads overlap.
  // The noop catch only keeps an early rejection from being reported as unhandled; the error still surfaces
  // at the await below, just as before.
  const renderedCandidatePromise = tryExtractRenderedMainContent(validatedUrl);
  renderedCandidatePromise.catch(() => {});
  const rawHtml = await fetchHtmlWithRetries(validatedUrl);

  const dom = new JSDOM(rawHtml, { url: validatedUrl });
  const readability = new Readability(dom.window.document).parse();
  const selection = selectMainContentHtml({
    rawHtml,
    readabilityHtml: readability?.content,
    readabilityTextLength: readability?.textContent
      ? normalizeInlineText(readability.textContent).length
      : 0,
  });
  dom.window.close();

  const warnings = [...selection.warnings];
  let bestHtml = selection.html;
  let bestMetrics = getContentMetrics(selection.html);

  const renderedCandidate = await renderedCandidatePromise;
  if (renderedCandidate) {
    const renderedMetrics = getContentMetrics(renderedCandidate.html);
    if (shouldPreferRenderedContent(bestMetrics, renderedMetrics)) {
      bestHtml = renderedCandidate.html;
      bestMetrics = renderedMetrics;
      warnings.push(`Using rendered DOM extraction (${renderedCandidate.source}) to preserve dynamic sections.`);
    }
  }

  const document = htmlToStructuredDocument(bestHtml);

  if (document.plainText.length < FALLBACK_MIN_LENGTH) {
    warnings.push('Extracted website content is very short; diff output may be noisy.');
  }

  return { document, warnings };
}

export function parsePublicHttpUrl(rawUrl: string): URL {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new CompareServiceError('INVALID_URL', 'URL is invalid. Please provide a full http/https URL.');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new CompareServiceError('INVALID_URL', 'Only http/https URLs are supported.');
  }

  return parsedUrl;
}

export function selectMainContentHtml(input: {
  rawHtml: string;
  readabilityHtml?: string | null;
  readabilityTextLength?: number;
}): MainContentSelection {
  const warnings: string[] = [];

  if (
    input.readabilityHtml &&
    (input.readabilityTextLength ?? getTextLength(input.readabilityHtml)) >= READABILITY_MIN_LENGTH
  ) {
    return {
      html: input.readabilityHtml,
      source: 'readability',
      warnings,
    };
  }

  warnings.push('Readability content was sparse; using fallback extraction.');

  const $ = load(input.rawHtml);
  $('script, style, noscript, template, svg, canvas, iframe').remove();

  const candidates: Array<{ selector: string; source: SelectionSource }> = [
    { selector: 'article', source: 'article' },
    { selector: 'main', source: 'main' },
  ];

  for (const candidate of candidates) {
    const node = $(candidate.selector).first();
    if (!node.length) {
      continue;
    }

    const clone = node.clone();
    clone.find('nav, header, footer, aside, form').remove();
    const html = clone.html() ?? '';

    if (getTextLength(html) >= FALLBACK_MIN_LENGTH) {
      warnings.push(`Using <${candidate.source}> fallback extraction.`);
      return { html, source: candidate.source, warnings };
    }
  }

  const body = $('body').first();
  if (body.length) {
    const clone = body.clone();
    clone.find('nav, header, footer, aside, form').remove();
    const html = clone.html() ?? '';
    warnings.push('Using cleaned <body> fallback extraction.');
    return { html, source: 'body', warnings };
  }

  warnings.push('Using raw page HTML because no primary content container was found.');
  return {
    html: input.rawHtml,
    source: 'body',
    warnings,
  };
}

async function fetchHtmlWithRetries(url: string): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt += 1) {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'user-agent': 'TextDiffChecker/0.1',
        },
      });

      if (timeout) {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        if (isRetryableStatus(response.status) && attempt < FETCH_ATTEMPTS) {
          await delay(attempt * 250);
          continue;
        }

        throw new CompareServiceError(
          'NETWORK_ERROR',
          `Failed to fetch website content (HTTP ${response.status}).`,
        );
      }

      return await response.text();
    } catch (error) {
      if (timeout) {
        clearTimeout(timeout);
      }
      lastError = error;
      if (attempt >= FETCH_ATTEMPTS || !isRetryableError(error)) {
        break;
      }
      await delay(attempt * 250);
    }
  }

  if (lastError instanceof CompareServiceError) {
    throw lastError;
  }

  throw new CompareServiceError(
    'NETWORK_ERROR',
    `Unable to fetch website content after ${FETCH_ATTEMPTS} attempts.`,
  );
}

function getTextLength(html: string): number {
  return getContentMetrics(html).textLength;
}

function getContentMetrics(html: string): {
  textLength: number;
  headingCount: number;
} {
  const $ = load(html);
  return {
    textLength: normalizeInlineText($.text()).length,
    headingCount: $('h1, h2, h3, h4, h5, h6').length,
  };
}

function shouldPreferRenderedContent(
  current: { textLength: number; headingCount: number },
  rendered: { textLength: number; headingCount: number },
): boolean {
  if (rendered.textLength < FALLBACK_MIN_LENGTH) {
    return false;
  }

  if (rendered.headingCount > current.headingCount) {
    return true;
  }

  if (rendered.headingCount === current.headingCount && rendered.textLength > current.textLength * 1.08) {
    return true;
  }

  return rendered.textLength > current.textLength * 1.16;
}

function isRetryableStatus(statusCode: number): boolean {
  return statusCode === 408 || statusCode === 429 || statusCode >= 500;
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error instanceof CompareServiceError) {
    return false;
  }

  return error.name === 'AbortError' || error.name === 'TypeError';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
