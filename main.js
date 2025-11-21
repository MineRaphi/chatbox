import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';

import path from 'path'; // Node path module

function createWindow() {
  const win = new BrowserWindow({
    ...(process.platform !== 'darwin' ? { titleBarOverlay: true } : {}),
    width: 800,
    height: 600,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
    color: "rgba(0, 0, 0, 0)",
    symbolColor: '#ffffff',
    height: 20
    }
  })

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()

  // Listen for shortcut messages from renderer
ipcMain.handle('set-shortcut', (event, shortcut) => {
  // Remove old shortcuts
  globalShortcut.unregisterAll();

  // Register new global shortcut
  const success = globalShortcut.register(shortcut, () => {
    console.log('GLOBAL HOTKEY TRIGGERED:', shortcut);
    // Do your action here
  });

  if (!success) {
    console.log('Failed to register shortcut:', shortcut);
  }
});

})

