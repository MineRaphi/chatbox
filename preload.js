const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronSocket', {
    // main to scripts
    onConnect: (cb) => ipcRenderer.on('socket:connect', (e, id) => cb(id)),                                 // connection established
    onHeartbeat: (cb) => ipcRenderer.on('socket:heartbeat', (e, data) => cb(data)),                         // heartbeat received
    onDisconnect: (cb) => ipcRenderer.on('socket:disconnect', (e, reason) => cb(reason)),                   // disconnected from server
    onError: (cb) => ipcRenderer.on('socket:error', (e, error) => cb(error)),                               // socket error
    onRegisterSuccess: (cb) => ipcRenderer.on('user:registerSuccess', () => cb()),                          // registration successful
    onRegisterFailure: (cb) => ipcRenderer.on('user:registerFailure', (e, message) => cb(message)),         // registration failed
    onLoginSuccess: (cb) => ipcRenderer.on('user:loginSuccess', () => cb()),                                // login successful
    onLoginFailure: (cb) => ipcRenderer.on('user:loginFailure', (e, message) => cb(message)),               // login failed
    recieveChatMessage: (cb) => ipcRenderer.on('chat:receiveMessage', (e, data) => cb(data)),               // chat message received
    onPreferencesLoaded: (cb) => ipcRenderer.on('preferences:loaded', (e, prefs) => cb(prefs)),             // preferences loaded
    onChatHistory: (cb) => ipcRenderer.on('chat:history', (e, history) => cb(history)),                     // chat history received
    // scripts to main
    emit: (eventName, payload) => ipcRenderer.send('socket:emit', { eventName, payload }),                  // emit socket event
    tryServerConnect: (ip, port) => ipcRenderer.send('server:select', { ip, port }),                        // try to connect to server
    register: (username, password) => ipcRenderer.send('user:register', { username, password }),            // register new user
    login: (username, password) => ipcRenderer.send('user:login', { username, password }),                  // login existing user
    sendChatMessage: (message) => ipcRenderer.send('chat:sendMessage', { message }),                        // send chat message
    loadPreferences: () => ipcRenderer.send('preferences:load'),                                            // load user preferences
    changePreference: (prefName, value) => ipcRenderer.send('preferences:change', { prefName, value }),     // change a preference
    getChatHistory: () => ipcRenderer.send('chat:getHistory'),                                              // get chat history
    send7tvEmote: (emoteId) => ipcRenderer.send('chat:send7tvEmote', { emoteId }),                          // send 7tv emote
})



