import { app, BrowserWindow } from'electron/main'

function createWindow() {
  const win = new BrowserWindow({
    ...(process.platform !== 'darwin' ? { titleBarOverlay: true } : {}),
    width: 800,
    height: 600,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
    color: "rgba(0, 0, 0, 0)",
    symbolColor: '#ffffff',
    height: 20
    }
  })

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()
})