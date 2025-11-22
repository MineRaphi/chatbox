// This renderer script now communicates with the main process for socket events.
console.log('Renderer: setting up socket IPC listeners')

if (window.electronSocket) {
    window.electronSocket.onConnect((id) => {
        console.log('Connected to server via main process with id:', id)
        window.location.href = "login.html";
    })

    window.electronSocket.onHeartbeat((data) => {
        console.log('heartbeat', data)
    })

    window.electronSocket.onDisconnect((reason) => {
        console.log('socket disconnected:', reason)
    })

    document.getElementById("connectBtn").addEventListener("click", function() {
        console.log("BUTTON CLICKED");
        const ip = document.getElementById("ip").value;
        const port = document.getElementById("port").value;
        window.electronSocket.tryServerConnect(ip, port);
    });
} else {
    console.warn('electronSocket API not available. Are you running inside Electron with the preload script?')
}
