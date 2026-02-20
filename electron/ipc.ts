import { dialog, ipcMain } from 'electron';
import type { CompareRequest, CompareResponse, IpcResult } from '../src/shared/compare';
import { runComparison } from './services/compare-service';
import { toCompareError } from './services/errors';

const SELECT_DOCX_CHANNEL = 'selectDocx';
const RUN_COMPARE_CHANNEL = 'runCompare';

export function registerIpcHandlers(): void {
  ipcMain.removeHandler(SELECT_DOCX_CHANNEL);
  ipcMain.removeHandler(RUN_COMPARE_CHANNEL);

  ipcMain.handle(SELECT_DOCX_CHANNEL, async () => {
    const selection = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        {
          name: 'Word document',
          extensions: ['docx'],
        },
      ],
    });

    if (selection.canceled) {
      return null;
    }

    return selection.filePaths[0] ?? null;
  });

  ipcMain.handle(
    RUN_COMPARE_CHANNEL,
    async (_event, request: CompareRequest): Promise<IpcResult<CompareResponse>> => {
      try {
        const result = await runComparison(request);
        return { ok: true, data: result };
      } catch (error) {
        return { ok: false, error: toCompareError(error) };
      }
    },
  );
}
