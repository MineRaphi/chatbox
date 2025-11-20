import { app, BrowserWindow } from'electron/main'

const createWindow = () => {
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})