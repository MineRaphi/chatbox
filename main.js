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

// Create the main application window
function createWindow() {
    const win = new BrowserWindow({
        ...(process.platform !== 'darwin' ? { titleBarOverlay: true } : {}),    // Enable title bar overlay for non-macOS platforms
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

    // Load preferences from store
    preferences.theme = store.get('theme', 'purple');
    preferences.serverIP = store.get('serverIP');
    preferences.serverPort = store.get('serverPort');
    preferences.username = store.get('username');
    preferences.password = store.get('password');
    
    win.loadFile('src/supersecretpage.html')

    return win
}

// Create a transparent window to display emotes
function createEmoteWindow(id) {
    // Calculate random position for the emote window (still needs some ajustments)
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

    // Close the emote window after 3.5 seconds
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

// Handle server selection and connect to the server
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

// Handle user registration
ipcMain.on('user:register', (event, { username, password }) => {
    if (socket && socket.connected) {
        socket.emit('register', { username, password });
    }
})

// Handle user login
ipcMain.on('user:login', (event, { username, password }) => {
    if (socket && socket.connected) {
        socket.emit('login', { username, password });
    }
})

// Handle sending chat messages
ipcMain.on('chat:sendMessage', (event, message) => {
    if (socket && socket.connected) {
        socket.emit('chatMessage', message);
    }
})

// Load preferences and send them to the renderer
ipcMain.on('preferences:load', (event) => {
    console.log("Loading preferences requested");
    event.sender.send('preferences:loaded', preferences);
});

// Change preferences and save them to the store
ipcMain.on('preferences:change', (event, { prefName, value }) => {
    console.log(`Preference change requested: ${prefName} = ${value}`);
    store.set(prefName, value);
});

// Handle request to get chat history
ipcMain.on('chat:getHistory', (event) => {
    if (socket && socket.connected) {
        socket.emit('getChatHistory');
    }
});

// Handle sending 7tv emotes
ipcMain.on('chat:send7tvEmote', (event, { emoteId }) => {
    if (socket && socket.connected) {
        socket.emit('7tvEmote', emoteId);
    }
    createEmoteWindow(emoteId);
});

// Setup socket event listeners
function setupSocketListeners() {
    // Connection established
    socket.on('connect', () => {
        console.log('Socket connected (main):', socket.id)
        BrowserWindow.getAllWindows().forEach(w => {
            w.webContents.send('socket:connect', socket.id)
        })
    })

    // Heartbeat received
    socket.on('heartbeat', (data) => {
        BrowserWindow.getAllWindows().forEach(w => {
            w.webContents.send('socket:heartbeat', data)
        })
    })

    // Disconnection event
    socket.on('disconnect', (reason) => {
        BrowserWindow.getAllWindows().forEach(w => {
            w.webContents.send('socket:disconnect', reason)
        })
    })

    // Connection error event
    socket.on('connect_error', (err) => {
        console.error('Failed to connect to server:', err.message);
        BrowserWindow.getAllWindows().forEach(w => {
            w.webContents.send('socket:error', err.message);
        });
        socket = null;
    })

    // Registration success event
    socket.on('register_success', (message) => {
        BrowserWindow.getAllWindows().forEach(w => {
            w.webContents.send('user:registerSuccess');
        });
    })

    // Registration failure event
    socket.on('register_failed', (message) => {
        BrowserWindow.getAllWindows().forEach(w => {
            w.webContents.send('user:registerFailure', message);
        });
    })

    // Login success event
    socket.on('login_success', (message) => {
        BrowserWindow.getAllWindows().forEach(w => {
            w.webContents.send('user:loginSuccess');
        });
    })
    
    // Login failure event
    socket.on('login_failed', (message) => {
        BrowserWindow.getAllWindows().forEach(w => {
            w.webContents.send('user:loginFailure', message);
        });
    })

    // Chat message received event
    socket.on('chatMessage', (data) => {    
        BrowserWindow.getAllWindows().forEach(w => {
            w.webContents.send('chat:receiveMessage', data);
        });
    })

    // Chat history received event
    socket.on('chatHistory', (history) => {
        BrowserWindow.getAllWindows().forEach(w => {
            w.webContents.send('chat:history', history);
        });
    })

    // 7tv emote received event
    socket.on('7tvEmote', (emoteId) => {
        createEmoteWindow(emoteId);
    })
}

// Initialize the application when ready
app.whenReady().then(() => {
    createWindow();
});
