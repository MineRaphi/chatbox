import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannel, type PickerApi } from '../shared/ipc';

const api: PickerApi = {
  getAppInfo: () => ipcRenderer.invoke(IpcChannel.GetAppInfo),
};

contextBridge.exposeInMainWorld('chatbox', api);
