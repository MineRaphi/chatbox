const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronSocket', {
    onConnect: (cb) => ipcRenderer.on('socket:connect', (e, id) => cb(id)),
    onHeartbeat: (cb) => ipcRenderer.on('socket:heartbeat', (e, data) => cb(data)),
    onDisconnect: (cb) => ipcRenderer.on('socket:disconnect', (e, reason) => cb(reason)),
    onError: (cb) => ipcRenderer.on('socket:error', (e, error) => cb(error)),
    emit: (eventName, payload) => ipcRenderer.send('socket:emit', { eventName, payload }),
    tryServerConnect: (ip, port) => ipcRenderer.send('server:select', { ip, port})
})
