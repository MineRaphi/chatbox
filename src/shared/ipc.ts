// Single source of truth for IPC channel names and the APIs each preload exposes.
// Main and renderers both import from here, so they cannot drift apart.

export const IpcChannel = {
  GetAppInfo: 'app:getInfo',
} as const;

export interface AppInfo {
  version: string;
  platform: NodeJS.Platform;
}

/** API exposed to the picker renderer as `window.chatbox`. */
export interface PickerApi {
  getAppInfo(): Promise<AppInfo>;
}
