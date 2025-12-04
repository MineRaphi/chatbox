import { app, BrowserWindow, ipcMain } from 'electron/main'
import Store from 'electron-store'
import path from 'path'
import { fileURLToPath } from 'url'
import { io } from 'socket.io-client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
let preferences = {};

let socket
const store = new Store()

function createWindow() {
    const win = new BrowserWindow({
        ...(process.platform !== 'darwin' ? { titleBarOverlay: true } : {}),
        title: 'chatbox',
        width: 800,
        height: 600,
        titleBarStyle: 'hidden',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        titleBarOverlay: {
            color: "rgba(0, 0, 0, 0)",
            symbolColor: '#ffffff',
            height: 20
        }
    })

    preferences.theme = store.get('theme', 'purple');
    preferences.serverIP = store.get('serverIP');
    preferences.serverPort = store.get('serverPort');
    preferences.username = store.get('username');
    preferences.password = store.get('password');
    
    win.loadFile('index.html')

    return win
}

function createEmoteWindow(id) {
    let x = Math.floor(Math.random() * ((1920 - 550) - 50 + 1)) + 50;
    let y = Math.floor(Math.random() * ((1080 - 350) - 50 + 1)) + 50;
    let size = 300;
    const emoteWindow = new BrowserWindow({
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        width: size,
        height: size,
        x: x,
        y: y,
    })

    emoteWindow.loadURL(`file://${__dirname}/emote.html#${id}`);
    emoteWindow.setIgnoreMouseEvents(true)

    setTimeout(() => {
        emoteWindow.close();
    }, 3500);
}

// Forward messages from renderer to the socket server
ipcMain.on('socket:emit', (event, { eventName, payload }) => {
    if (socket && socket.connected) {
        socket.emit(eventName, payload)
    }
})

ipcMain.on('server:select', (event, { ip, port }) => {
    console.log(`trying to connect to server ${ip}:${port}`)
    if (!socket) {
        socket = io(`http://${ip}:${port}`, {
            reconnection: false,
            timeout: 5000
        })

        setupSocketListeners();
    }
})

ipcMain.on('user:register', (event, { username, password }) => {
    if (socket && socket.connected) {
        socket.emit('register', { username, password });
    }
})

ipcMain.on('user:login', (event, { username, password }) => {
    if (socket && socket.connected) {
        socket.emit('login', { username, password });
    }
})

ipcMain.on('chat:sendMessage', (event, message) => {
    if (socket && socket.connected) {
        socket.emit('chatMessage', message);
    }
})

ipcMain.on('preferences:load', (event) => {
    console.log("Loading preferences requested");
    event.sender.send('preferences:loaded', preferences);
});

ipcMain.on('preferences:change', (event, { prefName, value }) => {
    console.log(`Preference change requested: ${prefName} = ${value}`);
    store.set(prefName, value);
});

ipcMain.on('chat:getHistory', (event) => {
    if (socket && socket.connected) {
        socket.emit('getChatHistory');
    }
});

ipcMain.on('chat:send7tvEmote', (event, { emoteId }) => {
    if (socket && socket.connected) {
        socket.emit('7tvEmote', emoteId);
    }
    createEmoteWindow(emoteId);
});

function setupSocketListeners() {
    socket.on('connect', () => {
        console.log('Socket connected (main):', socket.id)
        BrowserWindow.getAllWindows().forEach(w => {
            w.webContents.send('socket:connect', socket.id)
        })
    })

    socket.on('heartbeat', (data) => {
        BrowserWindow.getAllWindows().forEach(w => {
            w.webContents.send('socket:heartbeat', data)
        })
    })

    socket.on('disconnect', (reason) => {
        BrowserWindow.getAllWindows().forEach(w => {
            w.webContents.send('socket:disconnect', reason)
        })
    })

    socket.on('connect_error', (err) => {
        console.error('Failed to connect to server:', err.message);
        BrowserWindow.getAllWindows().forEach(w => {
            w.webContents.send('socket:error', err.message);
        });
        socket = null;
    })

    socket.on('register_success', (message) => {
        BrowserWindow.getAllWindows().forEach(w => {
            w.webContents.send('user:registerSuccess');
        });
    })
    socket.on('register_failed', (message) => {
        BrowserWindow.getAllWindows().forEach(w => {
            w.webContents.send('user:registerFailure', message);
        });
    })

    socket.on('login_success', (message) => {
        BrowserWindow.getAllWindows().forEach(w => {
            w.webContents.send('user:loginSuccess');
        });
    })
    
    socket.on('login_failed', (message) => {
        BrowserWindow.getAllWindows().forEach(w => {
            w.webContents.send('user:loginFailure', message);
        });
    })

    socket.on('chatMessage', (data) => {    
        BrowserWindow.getAllWindows().forEach(w => {
            w.webContents.send('chat:receiveMessage', data);
        });
    })

    socket.on('chatHistory', (history) => {
        BrowserWindow.getAllWindows().forEach(w => {
            w.webContents.send('chat:history', history);
        });
    })

    socket.on('7tvEmote', (emoteId) => {
        createEmoteWindow(emoteId);
    })
}

app.whenReady().then(() => {
    createWindow();
});
