import {
  Menu,
  Tray,
  app,
  nativeImage,
  type MenuItemConstructorOptions,
} from 'electron';
import type { ConnectionStatus } from '../shared/ipc';
import { getStatus, onStatus, sendEmote } from './connection';
import { getHotkey, onHotkeyChange } from './hotkey';
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

/** Send `count` random test emotes through the server, 150 ms apart. */
function sendBurst(count: number): void {
  for (let i = 0; i < count; i++) {
    setTimeout(() => sendEmote(randomTestEmote()), i * 150);
  }
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
          label: 'Send test emote to server',
          click: () => sendEmote(randomTestEmote()),
        },
        {
          label: 'Send 5 to server',
          click: () => sendBurst(5),
        },
        {
          label: 'Send 10 to server',
          click: () => sendBurst(10),
        },
        { type: 'separator' },
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

function statusLabel({ state, address }: ConnectionStatus): string {
  switch (state) {
    case 'not-configured':
      return 'No server set (open the picker)';
    case 'connecting':
      return `Connecting to ${address}…`;
    case 'connected':
      return `Connected to ${address}`;
    case 'reconnecting':
      return `Disconnected, reconnecting to ${address}…`;
  }
}

function updateMenu(status: ConnectionStatus): void {
  if (!tray) return;
  tray.setToolTip(`Chatbox: ${statusLabel(status)}`);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Open picker',
        click: () => showPicker(),
        // Display the global hotkey; it's registered separately.
        ...(getHotkey()
          ? { accelerator: getHotkey()!, registerAccelerator: false }
          : {}),
      },
      { type: 'separator' },
      { label: statusLabel(status), enabled: false },
      { type: 'separator' },
      ...debugMenu(),
      { label: 'Quit Chatbox', role: 'quit' },
    ]),
  );
}

export function createTray(): Tray {
  // nativeImage picks up tray@2x.png automatically on high-DPI displays.
  const icon = nativeImage.createFromPath(assetPath('tray.png'));
  tray = new Tray(icon);

  updateMenu(getStatus());
  onStatus(updateMenu);
  onHotkeyChange(() => updateMenu(getStatus()));

  // Windows/Linux users expect a left click on the tray icon to open the app.
  if (process.platform !== 'darwin') {
    tray.on('click', () => showPicker());
  }

  app.on('before-quit', () => tray?.destroy());
  return tray;
}
