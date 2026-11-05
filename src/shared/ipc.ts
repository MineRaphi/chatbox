// Single source of truth for IPC channel names and the APIs each preload exposes.
// Main and renderers both import from here, so they cannot drift apart.

export const IpcChannel = {
  GetAppInfo: 'app:getInfo',
  GetSettings: 'settings:get',
  SetSetting: 'settings:set',
  SettingsChanged: 'settings:changed',
  GetStatus: 'connection:getStatus',
  StatusChanged: 'connection:status',
  GetEmotes: 'emotes:get',
  RefreshEmotes: 'emotes:refresh',
  EmotesChanged: 'emotes:changed',
  SendEmote: 'emotes:send',
  ResolveEmoteSet: 'emotes:resolveSet',
  ToggleFavorite: 'favorites:toggle',
  GetHotkey: 'hotkey:get',
  HotkeyChanged: 'hotkey:changed',
  SetHotkeyRecording: 'hotkey:recording',
  PickerShown: 'picker:shown',
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
  /** 7TV emote set IDs to load; `global` is 7TV's global set. */
  emoteSets: string[];
  /** Electron accelerator that opens the picker, e.g. `CommandOrControl+Shift+E`. */
  hotkey: string;
  /** Pinned emotes, newest first, at most MAX_FAVORITES. */
  favorites: Emote[];
  /** Drop incoming emotes (your own previews still show). */
  doNotDisturb: boolean;
  launchAtLogin: boolean;
}

export const MAX_FAVORITES = 10;

/** Which view the picker opens on. */
export type PickerView = 'picker' | 'settings';

export type ResolvedSet =
  | { ok: true; id: string; name: string; count: number }
  | { ok: false; error: string };

export type FavoriteResult = 'added' | 'removed' | 'full' | 'invalid';

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

export interface Emote {
  id: string;
  name: string;
  animated: boolean;
}

export interface EmoteList {
  emotes: Emote[];
  /** Display names of cached sets, by set ID. */
  setNames: Record<string, string>;
  /** Set when the last refresh failed; `emotes` may still hold cached data. */
  error: string | null;
  /** True while a refresh from 7TV is in flight. */
  loading: boolean;
}

/** One emote to show in an overlay window. */
export interface OverlayEmote {
  url: string;
  sizePx: number;
  durationMs: number;
  /** When true, the overlay keeps at most 5 emotes and drops the oldest. */
  limitOnScreen: boolean;
}

/**
 * API exposed to the picker renderer as `window.chatbox`.
 * Callbacks must return nothing: the context bridge copies return values,
 * and Svelte state proxies can't be copied.
 */
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
  getEmotes(): Promise<EmoteList>;
  refreshEmotes(): Promise<void>;
  onEmotesChanged(callback: (list: EmoteList) => void): void;
  /** Send to the server and show locally. Resolves false for an invalid ID. */
  sendEmote(emoteId: string): Promise<boolean>;
  /** Check a pasted 7TV set link or ID (old or new format) before adding it. */
  resolveEmoteSet(input: string): Promise<ResolvedSet>;
  /** Add or remove a favorite. Adding to a full list returns `full`. */
  toggleFavorite(emote: Emote): Promise<FavoriteResult>;
  /** The hotkey that is actually registered, or null if registering failed. */
  getHotkey(): Promise<string | null>;
  onHotkeyChanged(callback: (hotkey: string | null) => void): void;
  /** Pause the global hotkey while the user records a new one. */
  setHotkeyRecording(recording: boolean): Promise<void>;
  /** Fires every time the picker window is shown, with the view to open. */
  onShown(callback: (view: PickerView) => void): void;
}

/** CDN URL for an emote image at 1x to 4x resolution. */
export function emoteUrl(id: string, scale: 1 | 2 | 3 | 4): string {
  return `https://cdn.7tv.app/emote/${id}/${scale}x.webp`;
}

/** API exposed to overlay renderers as `window.overlay`. Receive only. */
export interface OverlayApi {
  onShow(callback: (emote: OverlayEmote) => void): void;
}
