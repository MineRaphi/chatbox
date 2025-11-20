import { app, BrowserWindow } from 'electron'
import { io } from "socket.io-client";

const socket = io();

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600
  })

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()
})