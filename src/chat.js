const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
let emotesCache = [];
let filteredEmotes = [];

addEventListener("keydown", (e) => {
    if (e.key === "Enter" && document.activeElement === chatInput) {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (message) {
            console.log("Sending chat message:", message);
            window.electronSocket.sendChatMessage(message);
            chatInput.value = "";
        }
    }
});

window.addEventListener('load', () => {
    console.log("Window loaded, requesting chat history.");
    if (window.electronSocket) {
        window.electronSocket.getChatHistory();
    }
});

if (window.electronSocket) {
    window.electronSocket.recieveChatMessage((data) => {
        console.log("Received chat message data:", data);
        convertDataToChatMessage(data);
    });

    window.electronSocket.onChatHistory((history) => {
        console.log("Received chat history:", history);
        chatMessages.innerHTML = ""; // Clear existing messages
        history.forEach(msgData => {
            convertDataToChatMessage(msgData);
        });
    });
}

async function convertDataToChatMessage(data) {
    console.log("Converting data to chat message:", data);
    const message = document.createElement("div");
    message.classList.add("chat-message");
    message.classList.add("text-white");
    const content = await emoteReplacment(`${data.user}: ${data.message}`);
    message.appendChild(content);
    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function emoteReplacment(text) {
    const words = text.split(/\s+/);
    const fragment = document.createDocumentFragment();

    for (const word of words) {
        // CASE SENSITIVE MATCH
        const emote = emotesCache.find(e => e.name === word);

        if (emote) {
            const img = document.createElement("img");
            img.src = emote.url;
            img.className = "inline-block h-8 align-middle mr-1 emote";
            img.style.marginBottom = "0.25rem";
            fragment.appendChild(img);
        } else {
            const span = document.createElement("span");
            span.textContent = word + " ";
            span.className = "text-white";
            fragment.appendChild(span);
        }
    }
    return fragment;
}

async function fetchEmotes() {
    try {
        // Global
        const globalRes = await fetch("https://7tv.io/v3/emote-sets/global");
        const globalData = await globalRes.json();
        const globalEmotes = globalData.emotes ?? [];

        // LetsHugoTV
        const hugoSetId = "01FQW2WZ800000QXHG0DRS83G9";
        const hugoRes = await fetch(`https://7tv.io/v3/emote-sets/${hugoSetId}`);
        const hugoData = await hugoRes.json();
        const hugoEmotes = hugoData.emotes ?? [];

        // Caedrel
        const caedrelSetId = "01FSESZMBG0001Z3WXBKV368D1";
        const caedrelRes = await fetch(`https://7tv.io/v3/emote-sets/${caedrelSetId}`);
        const caedrelData = await caedrelRes.json();
        const caedrelEmotes = caedrelData.emotes ?? [];

        // Combine
        const allEmotes = [...globalEmotes, ...hugoEmotes, ...caedrelEmotes];

        emotesCache = allEmotes.map(e => {
            const url = `https://cdn.7tv.app/emote/${e.id}/2x.webp`;
            return { name: e.name, url };
        });

        console.log("Total emotes fetched:", emotesCache.length);
    } catch (err) {
        console.error("Failed to fetch emotes from sets:", err);
    }
}

fetchEmotes().then(() => {
    filteredEmotes = emotesCache; // default: show all
});