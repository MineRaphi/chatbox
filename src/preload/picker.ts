import { contextBridge, ipcRenderer } from 'electron';
import {
  IpcChannel,
  type ConnectionStatus,
  type EmoteList,
  type PickerApi,
  type PickerView,
  type Settings,
} from '../shared/ipc';

const api: PickerApi = {
  getAppInfo: () => ipcRenderer.invoke(IpcChannel.GetAppInfo),
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
  onShown: (callback) => {
    ipcRenderer.on(IpcChannel.PickerShown, (_event, view: PickerView) =>
      callback(view),
    );
  },
};

contextBridge.exposeInMainWorld('chatbox', api);
