import path from 'node:path';
import { _electron as electron, expect, test } from '@playwright/test';

test.skip(!process.env.RUN_ELECTRON_SMOKE, 'Set RUN_ELECTRON_SMOKE=1 to run Electron smoke tests.');

test('launches the desktop shell', async () => {
  const mainEntry = path.resolve(process.cwd(), 'dist-electron/electron/main.js');
  const app = await electron.launch({
    args: [mainEntry],
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '0',
      ELECTRON_USE_DIST: '1',
    },
  });

  const window = await app.firstWindow();
  await expect(window).toHaveTitle(/Text Diff Checker/i);

  await app.close();
});
