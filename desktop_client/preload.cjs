const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setIgnoreMouseEvents: (ignore) => ipcRenderer.send('set-ignore-mouse-events', ignore),
  resizeWindow: (width, height) => ipcRenderer.send('resize-window', { width, height }),
  closeWindow: () => ipcRenderer.send('close-window')
});
