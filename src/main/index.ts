import { app } from 'electron';
import started from 'electron-squirrel-startup';
import { initConnection } from './connection';
import { registerIpc } from './ipc';
import { initOverlays } from './overlay';
import { initPicker, showPicker } from './picker';
import { createTray } from './tray';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Transparent overlay windows on Linux need this before the app is ready.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-transparent-visuals');
}

// Only one instance: a second launch opens the picker of the running one.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => showPicker());

  // Tray app: closing every window must not quit.
  app.on('window-all-closed', () => {});

  registerIpc();

  void app.whenReady().then(() => {
    // Packaged builds hide the dock icon via LSUIElement; this covers dev runs.
    app.dock?.hide();
    createTray();

    // Linux compositors need a moment after startup before transparent
    // windows render correctly.
    const overlayDelay = process.platform === 'linux' ? 500 : 0;
    setTimeout(initOverlays, overlayDelay);

    initConnection();
    initPicker();
  });
}
