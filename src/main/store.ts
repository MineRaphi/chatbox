import { EventEmitter } from 'node:events';
import { BrowserWindow } from 'electron';
import Store from 'electron-store';
import {
  IpcChannel,
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
};

const MONITORS: readonly MonitorTarget[] = ['primary', 'all', 'cursor'];
const HOST = /^[A-Za-z0-9.-]{0,253}$/;

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
};

let store: Store<Settings> | null = null;
const events = new EventEmitter<{
  change: [key: SettingKey, settings: Settings];
}>();

// Keys written by the old (pre-rework) app into the same config file.
const LEGACY_KEYS = ['theme', 'serverIP', 'username', 'password'] as const;

/**
 * One-time cleanup of the old app's settings: keep the server address,
 * fix the port type, and delete everything else, including any plaintext
 * password the old login screen saved.
 */
function migrateLegacy(s: Store<Settings>): void {
  const raw = s.store as unknown as Record<string, unknown>;
  if (!LEGACY_KEYS.some((k) => k in raw)) return;

  const oldHost = raw.serverIP;
  if (typeof oldHost === 'string' && HOST.test(oldHost.trim())) {
    s.set('serverHost', oldHost.trim());
  }
  const oldPort = Number(raw.serverPort);
  s.set(
    'serverPort',
    isInt(oldPort, 1, 65_535) ? oldPort : DEFAULTS.serverPort,
  );

  const untyped = s as unknown as Store<Record<string, unknown>>;
  for (const key of LEGACY_KEYS) untyped.delete(key);
}

function getStore(): Store<Settings> {
  if (!store) {
    store = new Store<Settings>({ defaults: DEFAULTS });
    migrateLegacy(store);
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
