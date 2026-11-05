import { app, globalShortcut } from 'electron';
import started from 'electron-squirrel-startup';
import { initConnection } from './connection';
import { initEmotes } from './emotes';
import { initHotkey } from './hotkey';
import { registerIpc } from './ipc';
import { initOverlays } from './overlay';
import { initPicker, showPicker } from './picker';
import { createTray } from './tray';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

if (process.platform === 'linux') {
  // Transparent overlay windows need this before the app is ready.
  app.commandLine.appendSwitch('enable-transparent-visuals');
  // Global shortcuts on Wayland go through the desktop portal.
  app.commandLine.appendSwitch('enable-features', 'GlobalShortcutsPortal');
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
    initHotkey();
    void initEmotes();
  });

  app.on('will-quit', () => globalShortcut.unregisterAll());
}
