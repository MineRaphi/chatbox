import { app, ipcMain } from 'electron';
import { IpcChannel, type AppInfo } from '../shared/ipc';
import { getStatus, sendEmote } from './connection';
import { getEmotes, refreshEmotes, resolveSet } from './emotes';
import { toggleFavorite } from './favorites';
import { getHotkey, setRecording } from './hotkey';
import { checkForUpdates, getUpdateStatus, openUpdate } from './updates';
import { X11_FLAG, displayServerInfo } from './session';
import { getSettings, isSettingKey, setSetting } from './store';

/** Handlers for requests coming from renderers. Push events are sent elsewhere. */
export function registerIpc(): void {
  ipcMain.handle(IpcChannel.GetAppInfo, (): AppInfo => ({
    version: app.getVersion(),
    platform: process.platform,
    ...displayServerInfo(),
  }));

  ipcMain.handle(IpcChannel.Restart, () => {
    // An AppImage must be relaunched through the AppImage file itself, not
    // the binary inside its temporary mount.
    const appImage = process.env.APPIMAGE;
    // Drop the X11 flag: the new copy decides again from the current
    // setting (and re-adds it if native Wayland mode is off).
    const args = process.argv.slice(1).filter((a) => a !== X11_FLAG);
    app.relaunch({ args, ...(appImage ? { execPath: appImage } : {}) });
    app.quit();
  });

  ipcMain.handle(IpcChannel.GetSettings, () => getSettings());

  ipcMain.handle(
    IpcChannel.SetSetting,
    (_event, key: unknown, value: unknown) =>
      isSettingKey(key) ? setSetting(key, value) : false,
  );

  ipcMain.handle(IpcChannel.GetStatus, () => getStatus());

  ipcMain.handle(IpcChannel.GetEmotes, () => getEmotes());

  ipcMain.handle(IpcChannel.RefreshEmotes, () => refreshEmotes(true));

  ipcMain.handle(IpcChannel.SendEmote, (_event, emoteId: unknown) =>
    typeof emoteId === 'string' ? sendEmote(emoteId) : false,
  );

  ipcMain.handle(IpcChannel.ResolveEmoteSet, (_event, input: unknown) =>
    resolveSet(input),
  );

  ipcMain.handle(IpcChannel.GetUpdateStatus, () => getUpdateStatus());

  ipcMain.handle(IpcChannel.CheckForUpdates, () => checkForUpdates());

  ipcMain.handle(IpcChannel.OpenUpdate, (_event, what: unknown) => {
    if (what === 'download' || what === 'notes') openUpdate(what);
  });

  ipcMain.handle(IpcChannel.ToggleFavorite, (_event, emote: unknown) =>
    toggleFavorite(emote),
  );

  ipcMain.handle(IpcChannel.GetHotkey, () => getHotkey());

  ipcMain.handle(IpcChannel.SetHotkeyRecording, (_event, on: unknown) => {
    setRecording(on === true);
  });
}
