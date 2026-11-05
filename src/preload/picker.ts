import { contextBridge, ipcRenderer } from 'electron';
import {
  IpcChannel,
  type ConnectionStatus,
  type PickerApi,
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
};

contextBridge.exposeInMainWorld('chatbox', api);
