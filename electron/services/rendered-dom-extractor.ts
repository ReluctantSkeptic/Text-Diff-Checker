import type { BrowserWindow as BrowserWindowType } from 'electron';

const LOAD_TIMEOUT_MS = 20_000;
const SETTLE_DELAY_MS = 2_000;

type RenderedPayload = {
  html?: unknown;
  source?: unknown;
  textLength?: unknown;
  headingCount?: unknown;
};

export type RenderedExtractionResult = {
  html: string;
  source: string;
  textLength: number;
  headingCount: number;
};

const EXTRACTION_SCRIPT = `
(() => {
  const removeNoisyNodes = (root) => {
    root.querySelectorAll('script, style, noscript, template, nav, header, footer, aside, form, iframe, svg, canvas').forEach((node) => node.remove());
  };

  const summarize = (root, source) => {
    removeNoisyNodes(root);
    const textLength = (root.textContent || '').replace(/\\s+/g, ' ').trim().length;
    const headingCount = root.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
    return {
      html: root.innerHTML || '',
      source,
      textLength,
      headingCount,
    };
  };

  const selectors = [
    'article',
    'main',
    '.report-content',
    '.entry-content',
    '.post-content',
    '.content-area',
    '.site-main',
    '#content',
  ];

  for (const selector of selectors) {
    const node = document.querySelector(selector);
    if (!node) continue;
    const clone = node.cloneNode(true);
    const summary = summarize(clone, 'rendered:' + selector);
    if (summary.textLength >= 40) return summary;
  }

  if (document.body) {
    const bodyClone = document.body.cloneNode(true);
    return summarize(bodyClone, 'rendered:body');
  }

  return null;
})()
`;

export async function tryExtractRenderedMainContent(
  pageUrl: string,
): Promise<RenderedExtractionResult | null> {
  if (!process.versions.electron) {
    return null;
  }

  let BrowserWindowCtor: typeof BrowserWindowType | undefined;
  try {
    const electronModule = await import('electron');
    BrowserWindowCtor = electronModule.BrowserWindow;
  } catch {
    return null;
  }

  if (!BrowserWindowCtor) {
    return null;
  }

  const window = new BrowserWindowCtor({
    show: false,
    webPreferences: {
      sandbox: true,
      nodeIntegration: false,
      contextIsolation: true,
      javascript: true,
      webSecurity: true,
    },
  });

  try {
    await withTimeout(
      window.loadURL(pageUrl, {
        userAgent: 'TextDiffChecker/0.1',
      }),
      LOAD_TIMEOUT_MS,
    );

    await delay(SETTLE_DELAY_MS);
    const payload = (await withTimeout(
      window.webContents.executeJavaScript(EXTRACTION_SCRIPT, true),
      LOAD_TIMEOUT_MS,
    )) as RenderedPayload | null;

    if (!payload || typeof payload.html !== 'string') {
      return null;
    }

    const html = payload.html.trim();
    if (!html) {
      return null;
    }

    return {
      html,
      source: typeof payload.source === 'string' ? payload.source : 'rendered:body',
      textLength: typeof payload.textLength === 'number' ? payload.textLength : 0,
      headingCount: typeof payload.headingCount === 'number' ? payload.headingCount : 0,
    };
  } catch {
    return null;
  } finally {
    if (!window.isDestroyed()) {
      window.destroy();
    }
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error('Operation timed out.'));
      }, timeoutMs);
    });

    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
