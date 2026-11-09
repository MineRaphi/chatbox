import { contextBridge, ipcRenderer } from 'electron';
import {
  IpcChannel,
  type ConnectionStatus,
  type EmoteList,
  type LimitedNotice,
  type PickerApi,
  type PickerView,
  type UpdateStatus,
  type Settings,
} from '../shared/ipc';

const api: PickerApi = {
  getAppInfo: () => ipcRenderer.invoke(IpcChannel.GetAppInfo),
  restart: () => ipcRenderer.invoke(IpcChannel.Restart),
  getSettings: () => ipcRenderer.invoke(IpcChannel.GetSettings),
  setSetting: (key, value) =>
    ipcRenderer.invoke(IpcChannel.SetSetting, key, value),
  onSettingsChanged: (callback) => {
    ipcRenderer.on(IpcChannel.SettingsChanged, (_event, settings: Settings) =>
      callback(settings),
    );
  },
  getStatus: () => ipcRenderer.invoke(IpcChannel.GetStatus),
  onStatus: (callback) => {
    ipcRenderer.on(
      IpcChannel.StatusChanged,
      (_event, status: ConnectionStatus) => callback(status),
    );
  },
  onLimited: (callback) => {
    ipcRenderer.on(IpcChannel.Limited, (_event, notice: LimitedNotice) =>
      callback(notice),
    );
  },
  getEmotes: () => ipcRenderer.invoke(IpcChannel.GetEmotes),
  refreshEmotes: () => ipcRenderer.invoke(IpcChannel.RefreshEmotes),
  onEmotesChanged: (callback) => {
    ipcRenderer.on(IpcChannel.EmotesChanged, (_event, list: EmoteList) =>
      callback(list),
    );
  },
  sendEmote: (emoteId) => ipcRenderer.invoke(IpcChannel.SendEmote, emoteId),
  resolveEmoteSet: (input) =>
    ipcRenderer.invoke(IpcChannel.ResolveEmoteSet, input),
  toggleFavorite: (emote) =>
    ipcRenderer.invoke(IpcChannel.ToggleFavorite, emote),
  getHotkey: () => ipcRenderer.invoke(IpcChannel.GetHotkey),
  onHotkeyChanged: (callback) => {
    ipcRenderer.on(IpcChannel.HotkeyChanged, (_event, hotkey: string | null) =>
      callback(hotkey),
    );
  },
  setHotkeyRecording: (recording) =>
    ipcRenderer.invoke(IpcChannel.SetHotkeyRecording, recording),
  getUpdateStatus: () => ipcRenderer.invoke(IpcChannel.GetUpdateStatus),
  checkForUpdates: () => ipcRenderer.invoke(IpcChannel.CheckForUpdates),
  onUpdateStatus: (callback) => {
    ipcRenderer.on(
      IpcChannel.UpdateStatusChanged,
      (_event, status: UpdateStatus) => callback(status),
    );
  },
  openUpdate: (what) => ipcRenderer.invoke(IpcChannel.OpenUpdate, what),
  onShown: (callback) => {
    ipcRenderer.on(IpcChannel.PickerShown, (_event, view: PickerView) =>
      callback(view),
    );
  },
};

contextBridge.exposeInMainWorld('chatbox', api);
