import { app, globalShortcut } from 'electron';
import started from 'electron-squirrel-startup';
import { initAutostart } from './autostart';
import { initConnection } from './connection';
import { initEmotes } from './emotes';
import { initHotkey } from './hotkey';
import { registerIpc } from './ipc';
import { initOverlays } from './overlay';
import { initPicker, showPicker } from './picker';
import { getSetting } from './store';
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

  // Crash diagnostics: name the window or helper process that died and why.
  // (The picker also reloads itself; see picker.ts.)
  app.on('render-process-gone', (_event, contents, details) => {
    console.error(
      `[crash] renderer "${contents.getTitle() || contents.getURL()}" gone:`,
      `reason=${details.reason} exitCode=${details.exitCode}`,
    );
  });
  app.on('child-process-gone', (_event, details) => {
    console.error(
      `[crash] ${details.type} process gone:`,
      `reason=${details.reason} exitCode=${details.exitCode}`,
      details.name ?? '',
    );
  });

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
    initAutostart();
    void initEmotes();

    // First run: there's no window to find, so open setup right away.
    if (!getSetting('serverHost')) showPicker('settings');
  });

  app.on('will-quit', () => globalShortcut.unregisterAll());
}
