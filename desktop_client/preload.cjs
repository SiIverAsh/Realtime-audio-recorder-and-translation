const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setIgnoreMouseEvents: (ignore) => ipcRenderer.send('set-ignore-mouse-events', ignore),
  resizeWindow: (width, height, center) => ipcRenderer.send('resize-window', { width, height, center }),
  closeWindow: () => ipcRenderer.send('close-window')
});