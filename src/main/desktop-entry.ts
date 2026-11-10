import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// An AppImage is a single file that runs without installing, so unlike the
// .deb and .rpm nothing puts Chatbox into the app menu. When running from
// one, Chatbox adds its own menu entry (and icon) to the user's data folder,
// refreshed on every start so it follows the AppImage if it's moved.
// Removing it: delete ~/.local/share/applications/chatbox.desktop.

const dataHome = (): string =>
  process.env.XDG_DATA_HOME ?? path.join(os.homedir(), '.local', 'share');

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

  // NixOS can't start an AppImage directly (unless binfmt is set up), so the
  // friends there run it through appimage-run; the menu entry does the same.
  const exec = existsSync('/etc/NIXOS')
    ? `appimage-run "${appImage}"`
    : `"${appImage}"`;

  await writeIfChanged(
    path.join(dataHome(), 'applications', 'chatbox.desktop'),
    [
      '[Desktop Entry]',
      'Type=Application',
      'Name=Chatbox',
      'GenericName=Emote overlay',
      'Comment=Send 7TV emotes to your group',
      `Exec=${exec}`,
      `Icon=${icon}`,
      'Terminal=false',
      'Categories=Network;Chat;',
      'StartupWMClass=Chatbox',
      '',
    ].join('\n'),
  );
}

export function initDesktopEntry(): void {
  const appImage = process.env.APPIMAGE;
  if (process.platform !== 'linux' || !appImage) return;
  apply(appImage).catch((err) =>
    console.warn('[desktop-entry] could not add the app menu entry:', err),
  );
}
