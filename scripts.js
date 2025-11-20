// This renderer script now communicates with the main process for socket events.
console.log('Renderer: setting up socket IPC listeners')

if (window.electronSocket) {
    window.electronSocket.onConnect((id) => {
        console.log('Connected to server via main process with id:', id)
    })

    window.electronSocket.onHeartbeat((data) => {
        console.log('heartbeat', data)
    })

    window.electronSocket.onDisconnect((reason) => {
        console.log('socket disconnected:', reason)
    })
} else {
    console.warn('electronSocket API not available. Are you running inside Electron with the preload script?')
}

// Example: to emit an event to the server via main process:
// window.electronSocket.emit('some-event', { hello: 'world' })