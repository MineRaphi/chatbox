import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { app } from 'electron';
import { getSetting, onSettingChange } from './store';

// Electron has no login-item API on Linux; the freedesktop way is a
// .desktop file in ~/.config/autostart.
const linuxEntry = (): string =>
  path.join(
    process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config'),
    'autostart',
    'chatbox.desktop',
  );

async function applyLinux(enabled: boolean): Promise<void> {
  const file = linuxEntry();
  if (!enabled) {
    await fs.rm(file, { force: true });
    return;
  }
  // APPIMAGE is set when running from an AppImage; otherwise use the binary.
  const exec = process.env.APPIMAGE ?? process.execPath;
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(
    file,
    [
      '[Desktop Entry]',
      'Type=Application',
      'Name=Chatbox',
      `Exec="${exec}"`,
      'X-GNOME-Autostart-enabled=true',
      '',
    ].join('\n'),
  );
}

async function apply(enabled: boolean): Promise<void> {
  // In dev this would register the bare Electron binary as a login item.
  if (!app.isPackaged) {
    console.info(`[autostart] dev run: not applying launchAtLogin=${enabled}`);
    return;
  }
  if (process.platform === 'linux') {
    await applyLinux(enabled);
  } else {
    app.setLoginItemSettings({ openAtLogin: enabled });
  }
}

function run(enabled: boolean): void {
  apply(enabled).catch((err) =>
    console.warn('[autostart] could not update login item:', err),
  );
}

export function initAutostart(): void {
  // Re-apply on every start so a moved app or AppImage stays registered.
  run(getSetting('launchAtLogin'));
  onSettingChange((key, settings) => {
    if (key === 'launchAtLogin') run(settings.launchAtLogin);
  });
}
