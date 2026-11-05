import { app, ipcMain } from 'electron';
import started from 'electron-squirrel-startup';
import { IpcChannel, type AppInfo } from '../shared/ipc';
import { showPicker } from './picker';
import { createTray } from './tray';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Only one instance: a second launch opens the picker of the running one.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => showPicker());

  // Tray app: closing every window must not quit.
  app.on('window-all-closed', () => {});

  ipcMain.handle(
    IpcChannel.GetAppInfo,
    (): AppInfo => ({
      version: app.getVersion(),
      platform: process.platform,
    }),
  );

  void app.whenReady().then(() => {
    // Packaged builds hide the dock icon via LSUIElement; this covers dev runs.
    app.dock?.hide();
    createTray();
  });
}
