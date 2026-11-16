// Single source of truth for IPC channel names and the APIs each preload exposes.
// Main and renderers both import from here, so they cannot drift apart.

export const IpcChannel = {
  GetAppInfo: 'app:getInfo',
  Restart: 'app:restart',
  GetSettings: 'settings:get',
  SetSetting: 'settings:set',
  SettingsChanged: 'settings:changed',
  GetStatus: 'connection:getStatus',
  StatusChanged: 'connection:status',
  Limited: 'connection:limited',
  GetEmotes: 'emotes:get',
  RefreshEmotes: 'emotes:refresh',
  EmotesChanged: 'emotes:changed',
  SendEmote: 'emotes:send',
  ResolveEmoteSet: 'emotes:resolveSet',
  ToggleFavorite: 'favorites:toggle',
  GetHotkey: 'hotkey:get',
  HotkeyChanged: 'hotkey:changed',
  SetHotkeyRecording: 'hotkey:recording',
  GetUpdateStatus: 'updates:getStatus',
  CheckForUpdates: 'updates:check',
  UpdateStatusChanged: 'updates:status',
  OpenUpdate: 'updates:open',
  InstallUpdate: 'updates:install',
  PickerShown: 'picker:shown',
  OverlayShow: 'overlay:show',
} as const;

export interface AppInfo {
  version: string;
  platform: NodeJS.Platform;
  /** Linux: the desktop session is Wayland (overlays then run via XWayland
   *  unless native Wayland mode is on). */
  waylandSession: boolean;
  /** Linux: this run is native Wayland (false = X11 or XWayland). */
  nativeWayland: boolean;
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
  /** Show the sender's name under emotes from others. */
  showSenderName: boolean;
  /** Drop incoming emotes (your own previews still show). */
  doNotDisturb: boolean;
  launchAtLogin: boolean;
  /** Linux only: run natively on Wayland instead of through XWayland.
   *  Native: the global hotkey works, but overlays can't stay on top or
   *  follow you across virtual desktops. Takes effect after a restart. */
  linuxNativeWayland: boolean;
  /** Offer beta versions (pre-releases) as updates too. */
  includeBetaUpdates: boolean;
  /** Download and install updates without asking; they take effect on
   *  the next start. Only where Chatbox can update itself unattended. */
  autoUpdate: boolean;
  /** Internal: the newest version we already notified about, so the
   *  notification shows once per version, not on every start. */
  notifiedUpdateVersion: string;
}

export const MAX_FAVORITES = 10;

/** Which view the picker opens on. */
export type PickerView = 'picker' | 'settings';

export type ResolvedSet =
  | { ok: true; id: string; name: string; count: number }
  | { ok: false; error: string };

export type FavoriteResult = 'added' | 'removed' | 'full' | 'invalid';

export type SettingKey = keyof Settings;

/**
 * - `connecting`: opening the socket, or waiting for the server's `welcome`
 * - `connected`: joined a group (the server sent `welcome`)
 * - `rejected`: the server refused the join, or is too old to answer it;
 *   retried when the server address, name or group code change
 */
export type ConnectionState =
  | 'not-configured'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'rejected';

export interface ConnectionStatus {
  state: ConnectionState;
  /** `host:port` of the server, when one is configured. */
  address: string | null;
  /** Last connection error while reconnecting, or why the join was rejected. */
  error: string | null;
  /** The group joined, as typed; '' is the default group. Null until joined. */
  group: string | null;
  /** Display names in the group, including you. Empty until joined. */
  members: string[];
}

/** The server dropped an emote because you sent too many. */
export interface LimitedNotice {
  retryInMs: number;
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

export interface AvailableUpdate {
  /** e.g. `2.0.2` or `2.0.2-beta`. */
  version: string;
  prerelease: boolean;
  /** Release page with the notes. */
  pageUrl: string;
  /** The download for this platform, or the release page if none matched. */
  downloadUrl: string;
  /** File name of the download, when one matched. */
  fileName: string | null;
  /** SHA-256 of the download as GitHub reports it, when it does. */
  sha256: string | null;
  /** Windows installer builds: the release has the updater's own files. */
  squirrelFeed: boolean;
}

/**
 * How this copy of Chatbox was installed, which decides how it updates:
 * - `squirrel`: Windows installer (Chatbox-…-Windows-Setup.exe)
 * - `scoop`: Windows, installed with Scoop
 * - `win-portable`: Windows portable zip
 * - `appimage`, `deb`, `rpm`: Linux
 * - `mac`: macOS
 */
export type InstallKind =
  | 'squirrel'
  | 'scoop'
  | 'win-portable'
  | 'appimage'
  | 'deb'
  | 'rpm'
  | 'mac'
  | 'other';

/**
 * - `available`: there is a newer version; nothing downloaded yet
 * - `installing`: downloading or installing it (`progress` 0..1 if known)
 * - `ready`: installed; the new version runs from the next start
 */
export interface UpdateStatus {
  state:
    | 'idle'
    | 'checking'
    | 'up-to-date'
    | 'available'
    | 'installing'
    | 'ready'
    | 'error';
  /** The running version. */
  current: string;
  latest: AvailableUpdate | null;
  /** When the last check finished (ms since epoch). */
  checkedAt: number | null;
  /** Why the last check failed. */
  error: string | null;
  installKind: InstallKind;
  /** Chatbox can install `latest` itself (the Install button). */
  canInstall: boolean;
  /** This kind of install supports unattended updates (the toggle). */
  canAutoUpdate: boolean;
  /** Download progress from 0 to 1 while `installing`, when known. */
  progress: number | null;
  /** Why the last install attempt failed; the download link still works. */
  installError: string | null;
}

/** One emote to show in an overlay window. */
export interface OverlayEmote {
  url: string;
  sizePx: number;
  durationMs: number;
  /** When true, the overlay keeps at most 5 emotes and drops the oldest. */
  limitOnScreen: boolean;
  /** Sender's display name to show under the emote, or null for none. */
  from: string | null;
}

/**
 * API exposed to the picker renderer as `window.chatbox`.
 * Callbacks must return nothing: the context bridge copies return values,
 * and Svelte state proxies can't be copied.
 */
export interface PickerApi {
  getAppInfo(): Promise<AppInfo>;
  /** Quit and start Chatbox again (to apply restart-only settings). */
  restart(): Promise<void>;
  getSettings(): Promise<Settings>;
  /** Resolves false if the value was rejected by validation. */
  setSetting<K extends SettingKey>(
    key: K,
    value: Settings[K],
  ): Promise<boolean>;
  onSettingsChanged(callback: (settings: Settings) => void): void;
  getStatus(): Promise<ConnectionStatus>;
  onStatus(callback: (status: ConnectionStatus) => void): void;
  /** Fires when the server drops one of your emotes for the rate limit. */
  onLimited(callback: (notice: LimitedNotice) => void): void;
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
  getUpdateStatus(): Promise<UpdateStatus>;
  checkForUpdates(): Promise<void>;
  onUpdateStatus(callback: (status: UpdateStatus) => void): void;
  /** Open the download or the release notes of the available update. */
  openUpdate(what: 'download' | 'notes'): Promise<void>;
  /** Install the available update and restart; or, once it is `ready`,
   *  just restart into it. Progress and errors arrive as update status. */
  installUpdate(): Promise<void>;
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
