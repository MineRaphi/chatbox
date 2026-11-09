import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { BrowserWindow, app } from 'electron';
import Store from 'electron-store';
import {
  IpcChannel,
  MAX_FAVORITES,
  type MonitorTarget,
  type SettingKey,
  type Settings,
} from '../shared/ipc';

const DEFAULTS: Settings = {
  serverHost: '',
  serverPort: 3847,
  displayName: '',
  groupCode: '',
  overlaySizePx: 300,
  overlayDurationMs: 3_500,
  overlayMonitor: 'primary',
  limitOnScreen: false,
  limitRate: false,
  emoteSets: ['global'],
  hotkey: 'CommandOrControl+Shift+E',
  favorites: [],
  showSenderName: true,
  doNotDisturb: false,
  launchAtLogin: false,
  linuxNativeWayland: false,
  includeBetaUpdates: false,
  notifiedUpdateVersion: '',
};

const MONITORS: readonly MonitorTarget[] = ['primary', 'all', 'cursor'];
const HOST = /^[A-Za-z0-9.-]{0,253}$/;
const SET_ID = /^(global|[0-9A-Z]{26})$/;
// Modifiers and a key joined by `+`; Electron validates the rest on register.
const HOTKEY = /^[A-Za-z0-9+]{1,64}$/;
const MAX_SETS = 10;
const EMOTE_ID = /^[0-9A-Z]{26}$/;

/** A stored emote: valid 7TV ID, a short name, an animated flag. */
export function isStoredEmote(v: unknown): boolean {
  const e = v as { id?: unknown; name?: unknown; animated?: unknown } | null;
  return (
    typeof e?.id === 'string' &&
    EMOTE_ID.test(e.id) &&
    isText(e.name, 100) &&
    e.name !== '' &&
    typeof e.animated === 'boolean'
  );
}

const isInt = (v: unknown, min: number, max: number): v is number =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const isText = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.length <= max;

// Every value written from a renderer goes through these checks first.
const VALIDATORS: { [K in SettingKey]: (v: unknown) => boolean } = {
  serverHost: (v) => typeof v === 'string' && HOST.test(v),
  serverPort: (v) => isInt(v, 1, 65_535),
  displayName: (v) => isText(v, 32),
  groupCode: (v) => isText(v, 64),
  overlaySizePx: (v) => isInt(v, 100, 800),
  overlayDurationMs: (v) => isInt(v, 1_000, 15_000),
  overlayMonitor: (v) => MONITORS.includes(v as MonitorTarget),
  limitOnScreen: (v) => typeof v === 'boolean',
  limitRate: (v) => typeof v === 'boolean',
  emoteSets: (v) =>
    Array.isArray(v) &&
    v.length <= MAX_SETS &&
    v.every((id) => typeof id === 'string' && SET_ID.test(id)),
  hotkey: (v) => typeof v === 'string' && HOTKEY.test(v),
  favorites: (v) =>
    Array.isArray(v) && v.length <= MAX_FAVORITES && v.every(isStoredEmote),
  showSenderName: (v) => typeof v === 'boolean',
  doNotDisturb: (v) => typeof v === 'boolean',
  launchAtLogin: (v) => typeof v === 'boolean',
  linuxNativeWayland: (v) => typeof v === 'boolean',
  includeBetaUpdates: (v) => typeof v === 'boolean',
  notifiedUpdateVersion: (v) => isText(v, 64),
};

let store: Store<Settings> | null = null;
const events = new EventEmitter<{
  change: [key: SettingKey, settings: Settings];
}>();

// Keys written by the old (pre-rework) app into the same config file.
const LEGACY_KEYS = ['theme', 'serverIP', 'username', 'password'] as const;

/** Copy the old app's server address into the new settings. */
function importLegacyServer(
  s: Store<Settings>,
  raw: Record<string, unknown>,
): void {
  const oldHost = raw.serverIP;
  if (typeof oldHost === 'string' && HOST.test(oldHost.trim())) {
    s.set('serverHost', oldHost.trim());
  }
  const oldPort = Number(raw.serverPort);
  s.set(
    'serverPort',
    isInt(oldPort, 1, 65_535) ? oldPort : DEFAULTS.serverPort,
  );
}

/**
 * One-time cleanup of the old app's settings: keep the server address,
 * fix the port type, and delete everything else, including any plaintext
 * password the old login screen saved.
 */
function migrateLegacy(s: Store<Settings>): void {
  const raw = s.store as unknown as Record<string, unknown>;
  if (!LEGACY_KEYS.some((k) => k in raw)) return;

  importLegacyServer(s, raw);
  const untyped = s as unknown as Store<Record<string, unknown>>;
  for (const key of LEGACY_KEYS) untyped.delete(key);
}

/**
 * The old app was called "chatbox", the new one "Chatbox". On macOS and
 * Windows that is the same settings folder; on Linux (case-sensitive) the
 * old file lives on separately. Import its server address once and strip
 * the saved login from it.
 */
function migrateOldFolder(s: Store<Settings>): void {
  const oldFile = path.join(app.getPath('appData'), 'chatbox', 'config.json');
  if (
    path.resolve(oldFile).toLowerCase() === path.resolve(s.path).toLowerCase()
  ) {
    return; // same file, handled by migrateLegacy
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(fs.readFileSync(oldFile, 'utf8'));
  } catch {
    return; // no old file, or unreadable
  }
  if (!('username' in raw) && !('password' in raw) && !('serverIP' in raw)) {
    return;
  }

  if (!s.get('serverHost')) importLegacyServer(s, raw);
  delete raw.username;
  delete raw.password;
  delete raw.serverIP;
  try {
    fs.writeFileSync(oldFile, JSON.stringify(raw, null, 2));
  } catch (err) {
    console.warn('[store] could not clean the old settings file:', err);
  }
}

function getStore(): Store<Settings> {
  if (!store) {
    store = new Store<Settings>({ defaults: DEFAULTS });
    migrateLegacy(store);
    migrateOldFolder(store);
  }
  return store;
}

export function getSettings(): Settings {
  return { ...DEFAULTS, ...getStore().store };
}

export function getSetting<K extends SettingKey>(key: K): Settings[K] {
  return getStore().get(key);
}

export function isSettingKey(key: unknown): key is SettingKey {
  return typeof key === 'string' && Object.hasOwn(VALIDATORS, key);
}

/** Validate and save a setting, then tell main modules and every window. */
export function setSetting(key: SettingKey, value: unknown): boolean {
  const normalized = typeof value === 'string' ? value.trim() : value;
  if (!VALIDATORS[key](normalized)) return false;
  getStore().set(key, normalized as Settings[typeof key]);

  const settings = getSettings();
  events.emit('change', key, settings);
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IpcChannel.SettingsChanged, settings);
  }
  return true;
}

/** Subscribe to setting changes in the main process. */
export function onSettingChange(
  listener: (key: SettingKey, settings: Settings) => void,
): void {
  events.on('change', listener);
}
