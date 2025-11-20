const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('shortcutAPI', {
  setShortcut: (shortcut) => ipcRenderer.invoke('set-shortcut', shortcut)
});
