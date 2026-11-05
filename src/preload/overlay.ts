import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannel, type OverlayApi, type OverlayEmote } from '../shared/ipc';

const api: OverlayApi = {
  onShow: (callback) => {
    ipcRenderer.on(IpcChannel.OverlayShow, (_event, emote: OverlayEmote) =>
      callback(emote),
    );
  },
};

contextBridge.exposeInMainWorld('overlay', api);
