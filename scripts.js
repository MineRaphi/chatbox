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
document.addEventListener("DOMContentLoaded", () => {
    let emotesCache = [];

    async function fetchEmotes() {
        try {
            const res = await fetch("https://7tv.io/v3/emote-sets/global");
            const data = await res.json();

            console.log("Raw 7TV global response:", data);

            if (!data.emotes || data.emotes.length === 0) {
                console.warn("No emotes found in response.");
                return;
            }

            emotesCache = data.emotes.map(e => {
            // 7TV CDN URL format: https://cdn.7tv.app/emote/{emote_id}/2x.webp
            const url = `https://cdn.7tv.app/emote/${e.id}/2x.webp`;
            return { name: e.name, url };
        });

            console.log("7TV global emotes fetched:", emotesCache.length);
        } catch (err) {
            console.error("Failed to fetch 7TV emotes:", err);
        }
    }

    fetchEmotes();

    // Chat elements
    const chatInput = document.getElementById("chatInput");
    const chatMessages = document.getElementById("chatMessages");

    chatInput.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (!text) return;

            const words = text.split(/\s+/);

            words.forEach(word => {
                const emote = emotesCache.find(e => e.name.toLowerCase() === word.toLowerCase());
                if (emote) {
                    const img = document.createElement("img");
                    img.src = emote.url;
                    img.className = "inline-block w-8 h-8 mr-1 emote";
                    chatMessages.appendChild(img);
                } else {
                    const span = document.createElement("span");
                    span.textContent = word + " ";
                    span.className = "text-white";
                    chatMessages.appendChild(span);
                }
            });

            chatMessages.appendChild(document.createElement("br"));
            chatMessages.scrollTop = chatMessages.scrollHeight;
            chatInput.value = "";
        }
    });
});
