import { app, ipcMain } from 'electron';
import { IpcChannel, type AppInfo } from '../shared/ipc';
import { getStatus, sendEmote } from './connection';
import { getEmotes, refreshEmotes } from './emotes';
import { toggleFavorite } from './favorites';
import { getHotkey, setRecording } from './hotkey';
import { getSettings, isSettingKey, setSetting } from './store';

/** Handlers for requests coming from renderers. Push events are sent elsewhere. */
export function registerIpc(): void {
  ipcMain.handle(IpcChannel.GetAppInfo, (): AppInfo => ({
    version: app.getVersion(),
    platform: process.platform,
  }));

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

  ipcMain.handle(IpcChannel.ToggleFavorite, (_event, emote: unknown) =>
    toggleFavorite(emote),
  );

  ipcMain.handle(IpcChannel.GetHotkey, () => getHotkey());

  ipcMain.handle(IpcChannel.SetHotkeyRecording, (_event, on: unknown) => {
    setRecording(on === true);
  });
}
