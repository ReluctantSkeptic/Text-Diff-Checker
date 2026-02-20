import { useMemo, useState } from 'react';
import { DiffEditor, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import './App.css';
import {
  DEFAULT_COMPARE_OPTIONS,
  type CompareRequest,
  type CompareResponse,
} from './shared/compare';

loader.config({ monaco });

const EDITOR_OPTIONS = {
  readOnly: true,
  renderSideBySide: true,
  minimap: { enabled: false },
  wordWrap: 'on',
  diffWordWrap: 'on',
  wordWrapOverride1: 'on',
  wordWrapOverride2: 'on',
  renderControlCharacters: false,
  renderWhitespace: 'none',
  scrollBeyondLastLine: false,
  automaticLayout: true,
  lineNumbersMinChars: 3,
  scrollbar: {
    horizontal: 'hidden',
  },
} as const;

function enforceWrapForBothPanes(diffEditor: monaco.editor.IStandaloneDiffEditor): void {
  const paneOptions: monaco.editor.IEditorOptions = {
    wordWrap: 'on',
    wordWrapOverride1: 'on',
    wordWrapOverride2: 'on',
    renderControlCharacters: false,
    renderWhitespace: 'none',
    wrappingStrategy: 'advanced',
    scrollbar: {
      horizontal: 'hidden',
    },
    stopRenderingLineAfter: -1,
  };

  diffEditor.getOriginalEditor().updateOptions(paneOptions);
  diffEditor.getModifiedEditor().updateOptions(paneOptions);
  diffEditor.layout();
}

export default function App() {
  const [docPath, setDocPath] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isComparing, setIsComparing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);

  const canCompare = docPath.trim().length > 0 && pageUrl.trim().length > 0 && !isComparing;
  const hasBridge = typeof window.diffCheckerApi !== 'undefined';

  const warnings = result?.warnings ?? [];

  const stats = useMemo(() => {
    if (!result) {
      return null;
    }

    return [
      { label: 'Website chars', value: result.stats.leftChars },
      { label: 'Document chars', value: result.stats.rightChars },
      { label: 'Website blocks', value: result.stats.leftBlocks },
      { label: 'Document blocks', value: result.stats.rightBlocks },
      { label: 'Website images', value: result.stats.leftImages },
      { label: 'Document images', value: result.stats.rightImages },
      { label: 'Website tables', value: result.stats.leftTables },
      { label: 'Document tables', value: result.stats.rightTables },
    ];
  }, [result]);

  async function handleSelectDocx(): Promise<void> {
    if (!hasBridge) {
      setErrorMessage('Desktop bridge is not available. Start this in Electron, not plain browser mode.');
      return;
    }

    try {
      const selectedPath = await window.diffCheckerApi.selectDocx();
      if (selectedPath) {
        setDocPath(selectedPath);
        setErrorMessage('');
      }
    } catch {
      setErrorMessage('Failed to open file picker.');
    }
  }

  async function handleCompare(): Promise<void> {
    if (!hasBridge) {
      setErrorMessage('Desktop bridge is not available. Start this in Electron, not plain browser mode.');
      return;
    }

    setIsComparing(true);
    setErrorMessage('');

    const request: CompareRequest = {
      docPath,
      pageUrl,
      options: DEFAULT_COMPARE_OPTIONS,
    };

    try {
      const response = await window.diffCheckerApi.runCompare(request);

      if (!response.ok) {
        setResult(null);
        setErrorMessage(response.error.message);
        setIsComparing(false);
        return;
      }

      setResult(response.data);
      setIsComparing(false);
      return;
    } catch {
      setResult(null);
      setErrorMessage('Unexpected compare failure. Please try again.');
      setIsComparing(false);
      return;
    }
  }

  return (
    <div className={`app-shell ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="background-gradient" aria-hidden />
      <header className="control-bar">
        <div className="toolbar-row">
          <input
            className="url-input"
            value={pageUrl}
            onChange={(event) => setPageUrl(event.target.value)}
            placeholder="https://example.com/blog-post"
            type="url"
            aria-label="Website URL"
          />
          <input
            className="path-input"
            readOnly
            value={docPath}
            placeholder="No document selected"
            aria-label="Selected DOCX path"
          />
          <button className="action-button" onClick={handleSelectDocx} type="button">
            Select DOCX
          </button>
          <button className="compare-button" onClick={handleCompare} type="button" disabled={!canCompare}>
            {isComparing ? 'Comparing...' : 'Compare'}
          </button>
          <button
            className="theme-icon-button"
            onClick={() => setIsDarkMode((current) => !current)}
            type="button"
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? '☀' : '☾'}
          </button>
        </div>
      </header>

      {errorMessage && <section className="error-banner">{errorMessage}</section>}

      <main className="diff-zone">
        <div className="diff-label-row">
          <span className="diff-label">Website Source (Left)</span>
          <span className="diff-label">Document Source (Right)</span>
        </div>
        <div className="diff-editor-host">
          {result ? (
            <DiffEditor
              height="100%"
              language="plaintext"
              original={result.leftText}
              modified={result.rightText}
              options={EDITOR_OPTIONS}
              theme={isDarkMode ? 'vs-dark' : 'vs'}
              originalModelPath="inmemory://website-content.txt"
              modifiedModelPath="inmemory://document-content.txt"
              onMount={(editor) => {
                enforceWrapForBothPanes(editor);
              }}
            />
          ) : (
            <div className="empty-state">
              <p>Select a .docx file and enter a public URL to run the first comparison.</p>
              <p>The left pane will show website content, and the right pane will show document content.</p>
            </div>
          )}
        </div>
      </main>

      <section className={`insights-drawer ${isInsightsOpen ? 'open' : 'closed'}`}>
        <button
          className="drawer-toggle-button"
          onClick={() => setIsInsightsOpen((current) => !current)}
          type="button"
          aria-expanded={isInsightsOpen}
        >
          <span>{isInsightsOpen ? 'Hide Stats & Warnings' : 'Show Stats & Warnings'}</span>
          <span className="drawer-chevron" aria-hidden>
            {isInsightsOpen ? '▾' : '▴'}
          </span>
        </button>
        {isInsightsOpen && (
          <div className="status-panel">
            <div className="stats-grid">
              {stats ? (
                stats.map((item) => (
                  <article className="stat-tile" key={item.label}>
                    <span className="stat-label">{item.label}</span>
                    <span className="stat-value">{item.value}</span>
                  </article>
                ))
              ) : (
                <article className="stat-placeholder">Run a comparison to see extraction statistics.</article>
              )}
            </div>
            <div className="warnings-panel">
              <h2>Warnings</h2>
              {warnings.length > 0 ? (
                <ul>
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : (
                <p>No warnings.</p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
