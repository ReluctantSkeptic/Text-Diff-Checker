# Text Diff Checker

Desktop micro app for comparing a local `.docx` document with the live text content of a public website URL.

## What It Does

- Parses DOCX with `mammoth`
- Fetches website HTML and extracts main article content with Readability + fallbacks
- Normalizes text to reduce noisy diffs (spaces, smart quotes/dashes, blank lines)
- Preserves table text as structured lines:
  - `[TABLE n]`
  - `| cell1 | cell2 | ... |`
- Converts images to placeholders like `{image:Hero image}`
- Renders side-by-side diff using Monaco Diff Editor

## Stack

- Electron + TypeScript
- React + Vite
- Monaco Editor (`@monaco-editor/react`)
- `jsdom`, `@mozilla/readability`, `cheerio`
- `vitest` unit tests
- Playwright Electron smoke test (opt-in)

## Run Locally

```bash
npm install
npm run dev
```

This starts:

- Vite renderer on `http://localhost:5173`
- Electron desktop shell

## Build

```bash
npm run build
```

Build output:

- Renderer: `dist/`
- Electron main/services: `dist-electron/`

## Package Windows App

```bash
npm run dist
```

Installer output is written to `release/`.

## Test

```bash
npm test
```

Optional Electron smoke test:

```bash
npm run build
RUN_ELECTRON_SMOKE=1 npm run test:e2e
```

## Supported in V1

- DOCX file input
- Public `http/https` URL input
- Main-article extraction + fallback to `<article>`, `<main>`, cleaned `<body>`
- No persistence/history

## Out of Scope in V1

- Authenticated pages
- JS-rendered pages via headless browser fallback
- PDF/OCR (planned for phase 2)
