import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
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
import { initUpdates } from './updates';

// Dev runs get their own settings folder ("Chatbox Dev"), so `npm start`
// never touches the installed app's settings and both can run side by
// side (the single-instance lock is per settings folder). The first dev
// start copies the installed app's settings and emote cache once.
if (!app.isPackaged) {
  const appData = app.getPath('appData');
  const devDir = path.join(appData, 'Chatbox Dev');
  if (!existsSync(devDir)) {
    mkdirSync(devDir, { recursive: true });
    for (const file of ['config.json', 'emote-cache.json']) {
      const from = path.join(app.getPath('userData'), file);
      if (existsSync(from)) copyFileSync(from, path.join(devDir, file));
    }
  }
  app.setPath('userData', devDir);
}

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

// Windows only shows notifications from an installed app if it uses the
// same AppUserModelID as its Start menu shortcut; Squirrel names it
// com.squirrel.<package name>.<exe name>.
if (process.platform === 'win32') {
  app.setAppUserModelId('com.squirrel.chatbox.Chatbox');
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
    initUpdates();

    // First run: there's no window to find, so open setup right away.
    if (!getSetting('serverHost')) showPicker('settings');
  });

  app.on('will-quit', () => globalShortcut.unregisterAll());
}
