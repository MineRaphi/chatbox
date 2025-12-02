const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronSocket', {
    // main to scripts
    onConnect: (cb) => ipcRenderer.on('socket:connect', (e, id) => cb(id)),
    onHeartbeat: (cb) => ipcRenderer.on('socket:heartbeat', (e, data) => cb(data)),
    onDisconnect: (cb) => ipcRenderer.on('socket:disconnect', (e, reason) => cb(reason)),
    onError: (cb) => ipcRenderer.on('socket:error', (e, error) => cb(error)),
    onRegisterSuccess: (cb) => ipcRenderer.on('user:registerSuccess', () => cb()),
    onRegisterFailure: (cb) => ipcRenderer.on('user:registerFailure', (e, message) => cb(message)),
    onLoginSuccess: (cb) => ipcRenderer.on('user:loginSuccess', () => cb()),
    onLoginFailure: (cb) => ipcRenderer.on('user:loginFailure', (e, message) => cb(message)),
    recieveChatMessage: (cb) => ipcRenderer.on('chat:receiveMessage', (e, data) => cb(data)),
    onPreferencesLoaded: (cb) => ipcRenderer.on('preferences:loaded', (e, prefs) => cb(prefs)),
    // scripts to main
    emit: (eventName, payload) => ipcRenderer.send('socket:emit', { eventName, payload }),
    tryServerConnect: (ip, port) => ipcRenderer.send('server:select', { ip, port }),
    register: (username, password) => ipcRenderer.send('user:register', { username, password }),
    login: (username, password) => ipcRenderer.send('user:login', { username, password }),
    sendChatMessage: (message) => ipcRenderer.send('chat:sendMessage', { message }),
    loadPreferences: () => ipcRenderer.send('preferences:load'),
    changePreference: (prefName, value) => ipcRenderer.send('preferences:change', { prefName, value }),
})



