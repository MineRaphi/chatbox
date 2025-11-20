import { app, BrowserWindow } from 'electron'
import { io } from "socket.io-client";

const socket = io("http://localhost:3000" );

socket.on("connect", () => {
    console.log("Connected to server with id:", socket.id);
});

socket.on("heartbeat", (data) => {
    console.log(data);
});

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
