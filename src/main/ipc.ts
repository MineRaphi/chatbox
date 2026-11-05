import { app, ipcMain } from 'electron';
import { IpcChannel, type AppInfo } from '../shared/ipc';
import { getStatus } from './connection';
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
}
