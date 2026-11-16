import { accessSync, constants, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Notification, app } from 'electron';
import { settleAppImage, takeMoveNotice } from './appimage-home';
import { compareVersions, parseVersion } from './update-check';

// An AppImage is a single file that runs without installing, so unlike the
// .deb and .rpm nothing puts Chatbox into the app menu. When running from
// one, Chatbox adds its own menu entry (and icon) to the user's data folder,
// refreshed on every start so it follows the AppImage if it's moved.
// Removing it: delete ~/.local/share/applications/chatbox.desktop.

const dataHome = (): string =>
  process.env.XDG_DATA_HOME ?? path.join(os.homedir(), '.local', 'share');

/** Whether a program of that name can be started from PATH. */
function onPath(name: string): boolean {
  return (process.env.PATH ?? '').split(path.delimiter).some((dir) => {
    try {
      accessSync(path.join(dir, name), constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}

/**
 * The command line that starts this AppImage, for .desktop files. NixOS
 * can't run an AppImage directly (unless binfmt is set up for it), so
 * where appimage-run is installed, it does the starting.
 */
export function appImageExec(appImage: string): string {
  return existsSync('/etc/NIXOS') && onPath('appimage-run')
    ? `appimage-run "${appImage}"`
    : `"${appImage}"`;
}

/** Writes `content` unless the file already has exactly that content. */
async function writeIfChanged(
  file: string,
  content: string | Buffer,
): Promise<void> {
  const current = await fs.readFile(file).catch(() => null);
  if (current && current.equals(Buffer.from(content))) return;
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
}

async function apply(appImage: string): Promise<void> {
  // Shipped next to the app as an extra resource (see forge.config.mts).
  const icon = path.join(dataHome(), 'icons', 'chatbox.png');
  await writeIfChanged(
    icon,
    await fs.readFile(path.join(process.resourcesPath, 'chatbox.png')),
  );

  await writeIfChanged(
    path.join(dataHome(), 'applications', 'chatbox.desktop'),
    [
      '[Desktop Entry]',
      'Type=Application',
      'Name=Chatbox',
      'GenericName=Emote overlay',
      'Comment=Send 7TV emotes to your group',
      `Exec=${appImageExec(appImage)}`,
      `Icon=${icon}`,
      'Terminal=false',
      'Categories=Network;Chat;',
      'StartupWMClass=Chatbox',
      '',
    ].join('\n'),
  );
}

const homeRecordFile = (): string =>
  path.join(app.getPath('userData'), 'appimage-home.json');

function isNewer(a: string, b: string): boolean {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  return va !== null && vb !== null && compareVersions(va, vb) > 0;
}

/**
 * Move the AppImage to its permanent home, ~/Applications/Chatbox.AppImage
 * (see appimage-home.ts), and point $APPIMAGE there, which everything else
 * reads: the X11 restart, the menu entry, launch at login and updates.
 * Call early, while holding the single-instance lock.
 * CHATBOX_KEEP_APPIMAGE_IN_PLACE=1 switches it off (the release build's
 * startup tests run the AppImage from the build folder and need it there).
 */
export function settleAppImageHome(): void {
  const appImage = process.env.APPIMAGE;
  if (process.platform !== 'linux' || !appImage || !app.isPackaged) return;
  if (process.env.CHATBOX_KEEP_APPIMAGE_IN_PLACE === '1') return;
  const settled = settleAppImage({
    appImage,
    homeDir: os.homedir(),
    version: app.getVersion(),
    recordFile: homeRecordFile(),
    isNewer,
    launcherExec: appImageExec,
  });
  if (settled !== appImage) {
    console.log(`[appimage] moved ${appImage} to ${settled}`);
    process.env.APPIMAGE = settled;
  }
}

export function initDesktopEntry(): void {
  const appImage = process.env.APPIMAGE;
  if (process.platform !== 'linux' || !appImage) return;

  // Told once, by whichever copy starts up after the move.
  const movedFrom = takeMoveNotice(homeRecordFile());
  if (movedFrom && Notification.isSupported()) {
    new Notification({
      title: 'Chatbox moved itself to ~/Applications',
      body: `It was in ${path.dirname(movedFrom)}. From now on, start it from the app menu or with "chatbox" in a terminal.`,
    }).show();
  }

  apply(appImage).catch((err) =>
    console.warn('[desktop-entry] could not add the app menu entry:', err),
  );
}
