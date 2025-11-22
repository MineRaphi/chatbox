// This renderer script now communicates with the main process for socket events.
console.log('Renderer: setting up socket IPC listeners')

if (window.electronSocket) {
    window.electronSocket.onConnect((id) => {
        console.log('Connected to server via main process with id:', id)
        // If an error display was scheduled, cancel it and hide any visible error
        try {
            if (window.__pendingErrorTimeout) {
                clearTimeout(window.__pendingErrorTimeout);
                window.__pendingErrorTimeout = null;
            }
            const el = document.getElementById("errorText");
            if (el) {
                el.classList.add('hidden');
                el.textContent = '';
            }
        } catch (e) {
            console.warn('Error clearing pending error:', e);
        }

        window.location.href = "login.html";
    })

    window.electronSocket.onHeartbeat((data) => {
        console.log('heartbeat', data)
    })

    window.electronSocket.onDisconnect((reason) => {
        console.log('socket disconnected:', reason)
    })

    window.electronSocket.onError((error) => {
        console.error('Socket connection error:', error);
        document.getElementById("errorText").style.display = "block";
    });

    document.getElementById("connectBtn").addEventListener("click", function() {
        console.log("BUTTON CLICKED");
        const ip = document.getElementById("ip").value;
        const port = document.getElementById("port").value;
        window.electronSocket.tryServerConnect(ip, port);
    });
} else {
    console.warn('electronSocket API not available. Are you running inside Electron with the preload script?')
}
