import {
  Menu,
  Tray,
  app,
  nativeImage,
  type MenuItemConstructorOptions,
  type NativeImage,
} from 'electron';
import type { ConnectionStatus } from '../shared/ipc';
import { getStatus, onStatus, sendEmote } from './connection';
import { getHotkey, onHotkeyChange } from './hotkey';
import { showEmote } from './overlay';
import { assetPath } from './paths';
import { showPicker } from './picker';
import { getSetting, onSettingChange, setSetting } from './store';

// A few 7TV global emotes for the dev-only test menu.
const TEST_EMOTES = [
  '01GAFTZ9K80003DHH026MC7JW0', // PepePls
  '01FE3XY508000AA32JP519W2EW', // PETPET
  '01GAM8EFQ00004MXFXAJYKA859', // Clap
  '01GAZ199Z8000FEWHS6AT5QZV0', // peepoHappy
  '01GB8EQNJ8000497KFBZWNSDFZ', // forsenPls
];

let tray: Tray | null = null;
type IconState = 'normal' | 'offline' | 'dnd';
let icons: Record<IconState, NativeImage>;

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
    { type: 'separator' },
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
  ];
}

/** `friends`, or `default group` for an empty code. */
function groupName(group: string | null): string {
  return group ? group : 'default group';
}

function statusLabel(status: ConnectionStatus): string {
  const { state, address, group, members } = status;
  switch (state) {
    case 'not-configured':
      return 'No server set (open the picker)';
    case 'connecting':
      return `Connecting to ${address}…`;
    case 'connected':
      return `${address} · ${groupName(group)} · ${members.length} online`;
    case 'reconnecting':
      return `Disconnected, reconnecting to ${address}…`;
    case 'rejected':
      return `Couldn't join ${address} (see Settings)`;
  }
}

/**
 * Tray icons from assets/ (see scripts/generate-tray-icons.py). macOS gets
 * monochrome template images it recolours for light and dark menu bars;
 * Windows and Linux get the coloured icon, since taskbars are often dark.
 * The @2x files are picked up automatically on high-DPI displays.
 */
function loadIcons(): Record<IconState, NativeImage> {
  const suffix = process.platform === 'darwin' ? 'Template' : '';
  const load = (name: string): NativeImage =>
    nativeImage.createFromPath(assetPath(`${name}${suffix}.png`));
  return {
    normal: load('tray'),
    offline: load('trayOffline'),
    dnd: load('trayDnd'),
  };
}

function iconState(status: ConnectionStatus, dnd: boolean): IconState {
  if (dnd) return 'dnd';
  return status.state === 'connected' ? 'normal' : 'offline';
}

function updateMenu(): void {
  // Status changes keep coming while the app quits (the socket closing
  // reports a disconnect), after the tray is already gone.
  if (!tray || tray.isDestroyed()) return;
  const status = getStatus();
  const dnd = getSetting('doNotDisturb');
  const hotkey = getHotkey();

  tray.setImage(icons[iconState(status, dnd)]);
  tray.setToolTip(
    `Chatbox: ${statusLabel(status)}${dnd ? ' (Do not disturb)' : ''}`,
  );
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Open picker',
        click: () => showPicker(),
        // Display the global hotkey; it's registered separately.
        ...(hotkey ? { accelerator: hotkey, registerAccelerator: false } : {}),
      },
      { type: 'separator' },
      { label: statusLabel(status), enabled: false },
      {
        label: 'Do not disturb',
        type: 'checkbox',
        checked: dnd,
        click: (item) => setSetting('doNotDisturb', item.checked),
      },
      { type: 'separator' },
      { label: 'Settings…', click: () => showPicker('settings') },
      ...debugMenu(),
      { type: 'separator' },
      { label: 'Quit Chatbox', role: 'quit' },
    ]),
  );
}

export function createTray(): Tray {
  icons = loadIcons();
  tray = new Tray(icons.offline);

  updateMenu();
  onStatus(updateMenu);
  onHotkeyChange(updateMenu);
  onSettingChange((key) => {
    if (key === 'doNotDisturb') updateMenu();
  });

  // Windows/Linux users expect a left click on the tray icon to open the app.
  if (process.platform !== 'darwin') {
    tray.on('click', () => showPicker());
  }

  app.on('before-quit', () => {
    tray?.destroy();
    tray = null;
  });
  return tray;
}
