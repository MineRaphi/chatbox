// Single source of truth for IPC channel names and the APIs each preload exposes.
// Main and renderers both import from here, so they cannot drift apart.

export const IpcChannel = {
  GetAppInfo: 'app:getInfo',
  GetSettings: 'settings:get',
  SetSetting: 'settings:set',
  SettingsChanged: 'settings:changed',
  GetStatus: 'connection:getStatus',
  StatusChanged: 'connection:status',
  OverlayShow: 'overlay:show',
} as const;

export interface AppInfo {
  version: string;
  platform: NodeJS.Platform;
}

export type MonitorTarget = 'primary' | 'all' | 'cursor';

/** Everything the user can configure. Owned by main (store.ts). */
export interface Settings {
  serverHost: string;
  serverPort: number;
  /** Used once the server phase adds groups and sender names. */
  displayName: string;
  groupCode: string;
  overlaySizePx: number;
  overlayDurationMs: number;
  overlayMonitor: MonitorTarget;
  /** Keep at most 5 emotes on screen, dropping the oldest. */
  limitOnScreen: boolean;
  /** Accept at most 10 incoming emotes per 10 seconds. */
  limitRate: boolean;
}

export type SettingKey = keyof Settings;

export type ConnectionState =
  | 'not-configured'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

export interface ConnectionStatus {
  state: ConnectionState;
  /** `host:port` of the server, when one is configured. */
  address: string | null;
  /** Last connection error, shown while reconnecting. */
  error: string | null;
}

/** One emote to show in an overlay window. */
export interface OverlayEmote {
  url: string;
  sizePx: number;
  durationMs: number;
  /** When true, the overlay keeps at most 5 emotes and drops the oldest. */
  limitOnScreen: boolean;
}

/** API exposed to the picker renderer as `window.chatbox`. */
export interface PickerApi {
  getAppInfo(): Promise<AppInfo>;
  getSettings(): Promise<Settings>;
  /** Resolves false if the value was rejected by validation. */
  setSetting<K extends SettingKey>(
    key: K,
    value: Settings[K],
  ): Promise<boolean>;
  onSettingsChanged(callback: (settings: Settings) => void): void;
  getStatus(): Promise<ConnectionStatus>;
  onStatus(callback: (status: ConnectionStatus) => void): void;
}

/** API exposed to overlay renderers as `window.overlay`. Receive only. */
export interface OverlayApi {
  onShow(callback: (emote: OverlayEmote) => void): void;
}
