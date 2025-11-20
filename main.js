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

  // Initialize socket when window is ready (or earlier if you prefer)
  if (!socket) {
    socket = io('http://localhost:3000')

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
  }

  return win
}

// Forward messages from renderer to the socket server
ipcMain.on('socket:emit', (event, { eventName, payload }) => {
    if (socket && socket.connected) {
        socket.emit(eventName, payload)
    }
})

app.whenReady().then(() => {
    createWindow()
})