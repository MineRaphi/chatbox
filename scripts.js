import { io } from "https://cdn.socket.io/4.7.1/socket.io.esm.min.js";

console.log("Attempting to connect to server...");

const socket = io("http://localhost:3000" );

socket.on("connect", () => {
    console.log("Connected to server with id:", socket.id);
});

socket.on("heartbeat", (data) => {
    console.log(data);
});