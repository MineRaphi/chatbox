import { Menu, Tray, app, nativeImage } from 'electron';
import { assetPath } from './paths';
import { showPicker } from './picker';

let tray: Tray | null = null;

export function createTray(): Tray {
  // nativeImage picks up tray@2x.png automatically on high-DPI displays.
  const icon = nativeImage.createFromPath(assetPath('tray.png'));
  tray = new Tray(icon);
  tray.setToolTip('Chatbox');

  const menu = Menu.buildFromTemplate([
    { label: 'Open picker', click: () => showPicker() },
    { type: 'separator' },
    { label: 'Not connected', enabled: false },
    { type: 'separator' },
    { label: `Quit Chatbox`, role: 'quit' },
  ]);
  tray.setContextMenu(menu);

  // Windows/Linux users expect a left click on the tray icon to open the app.
  if (process.platform !== 'darwin') {
    tray.on('click', () => showPicker());
  }

  app.on('before-quit', () => tray?.destroy());
  return tray;
}
