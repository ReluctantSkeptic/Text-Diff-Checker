import { existsSync } from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow } from 'electron';
import { registerIpcHandlers } from './ipc';

const DEV_SERVER_URL = 'http://localhost:5173';

let mainWindow: BrowserWindow | null = null;

function createMainWindow(): void {
  const useDevServer = shouldUseDevServer();
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1200,
    minHeight: 720,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = {
      ...details.responseHeaders,
      'Content-Security-Policy': [buildCsp(useDevServer)],
    };

    callback({ responseHeaders });
  });

  if (!useDevServer) {
    const indexPath = path.join(__dirname, '../../dist/index.html');
    void mainWindow.loadFile(indexPath);
  } else {
    void mainWindow.loadURL(DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function resolvePreloadPath(): string {
  if (app.isPackaged) {
    return path.join(__dirname, '../../electron/preload.cjs');
  }

  const localPreload = path.join(__dirname, 'preload.cjs');
  if (existsSync(localPreload)) {
    return localPreload;
  }

  return path.join(__dirname, '../../electron/preload.cjs');
}

function shouldUseDevServer(): boolean {
  if (app.isPackaged) {
    return false;
  }

  return process.env.ELECTRON_USE_DIST !== '1';
}

function buildCsp(useDevServer: boolean): string {
  if (useDevServer) {
    return [
      "default-src 'self' data: blob: http://localhost:5173 http://127.0.0.1:5173",
      "script-src 'self' 'unsafe-inline' blob: http://localhost:5173 http://127.0.0.1:5173",
      "style-src 'self' 'unsafe-inline' http://localhost:5173 http://127.0.0.1:5173",
      "img-src 'self' data: blob: https: http:",
      "font-src 'self' data: http://localhost:5173 http://127.0.0.1:5173",
      "connect-src 'self' https: http: ws://localhost:5173 ws://127.0.0.1:5173",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join('; ');
  }

  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' data:",
    "connect-src 'self' https: http:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join('; ');
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
