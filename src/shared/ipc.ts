// Single source of truth for IPC channel names and the APIs each preload exposes.
// Main and renderers both import from here, so they cannot drift apart.

export const IpcChannel = {
  GetAppInfo: 'app:getInfo',
  OverlayShow: 'overlay:show',
} as const;

export interface AppInfo {
  version: string;
  platform: NodeJS.Platform;
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
}

/** API exposed to overlay renderers as `window.overlay`. Receive only. */
export interface OverlayApi {
  onShow(callback: (emote: OverlayEmote) => void): void;
}
