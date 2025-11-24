import { app, BrowserWindow, ipcMain } from 'electron/main'
import path from 'path'
import { fileURLToPath } from 'url'
import { io } from 'socket.io-client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let socket

function createWindow() {
    const win = new BrowserWindow({
        ...(process.platform !== 'darwin' ? { titleBarOverlay: true } : {}),
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

    win.loadFile('index.html')

    return win
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
        // disable automatic reconnection so connect_error fires only once per attempt
        socket = io(`http://${ip}:${port}`, {
            reconnection: false,
            timeout: 5000
        })

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
        });
    }
})


app.whenReady().then(() => {
    createWindow()
})