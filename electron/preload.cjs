const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('diffCheckerApi', {
  selectDocx: () => ipcRenderer.invoke('selectDocx'),
  runCompare: (request) => ipcRenderer.invoke('runCompare', request),
});
