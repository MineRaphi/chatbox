import {
  Menu,
  Tray,
  app,
  nativeImage,
  type MenuItemConstructorOptions,
} from 'electron';
import { showEmote } from './overlay';
import { assetPath } from './paths';
import { showPicker } from './picker';

// A few 7TV global emotes for the dev-only test menu.
const TEST_EMOTES = [
  '01GAFTZ9K80003DHH026MC7JW0', // PepePls
  '01FE3XY508000AA32JP519W2EW', // PETPET
  '01GAM8EFQ00004MXFXAJYKA859', // Clap
  '01GAZ199Z8000FEWHS6AT5QZV0', // peepoHappy
  '01GB8EQNJ8000497KFBZWNSDFZ', // forsenPls
];

let tray: Tray | null = null;

function randomTestEmote(): string {
  return TEST_EMOTES[Math.floor(Math.random() * TEST_EMOTES.length)]!;
}

function debugMenu(): MenuItemConstructorOptions[] {
  if (app.isPackaged) return [];
  return [
    {
      label: 'Debug',
      submenu: [
        {
          label: 'Show test emote (local)',
          click: () => showEmote(randomTestEmote(), false),
        },
        {
          label: 'Burst of 8 (tests the 5 on-screen limit)',
          click: () => {
            for (let i = 0; i < 8; i++) {
              setTimeout(() => showEmote(randomTestEmote(), false), i * 150);
            }
          },
        },
        {
          label: 'Burst of 15 remote (tests the 10 per 10 s cap)',
          click: () => {
            for (let i = 0; i < 15; i++) {
              setTimeout(() => showEmote(randomTestEmote(), true), i * 100);
            }
          },
        },
        {
          label: 'Invalid ID (should be ignored)',
          click: () => showEmote('../../etc/passwd', true),
        },
      ],
    },
    { type: 'separator' },
  ];
}

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
    ...debugMenu(),
    { label: 'Quit Chatbox', role: 'quit' },
  ]);
  tray.setContextMenu(menu);

  // Windows/Linux users expect a left click on the tray icon to open the app.
  if (process.platform !== 'darwin') {
    tray.on('click', () => showPicker());
  }

  app.on('before-quit', () => tray?.destroy());
  return tray;
}
