

document.addEventListener("DOMContentLoaded", () => {
    // ---------- 1️⃣ Emote cache ----------
    let emotesCache = [];

    // ---------- 2️⃣ Fetch 7TV global emotes ----------
async function fetchEmotes() {
    try {
        // Global set
        const globalRes = await fetch("https://7tv.io/v3/emote-sets/global");
        const globalData = await globalRes.json();
        const globalEmotes = globalData.emotes ?? [];

        // LetsHugoTV set
        const hugoSetId = "01FQW2WZ800000QXHG0DRS83G9";
        const hugoRes = await fetch(`https://7tv.io/v3/emote-sets/${hugoSetId}`);
        const hugoData = await hugoRes.json();
        const hugoEmotes = hugoData.emotes ?? [];

        // Caedrel set
        const caedrelSetId = "01FSESZMBG0001Z3WXBKV368D1";
        const caedrelRes = await fetch(`https://7tv.io/v3/emote-sets/${caedrelSetId}`);
        const caedrelData = await caedrelRes.json();
        const caedrelEmotes = caedrelData.emotes ?? [];

        // Combine all
        const allEmotes = [...globalEmotes, ...hugoEmotes, ...caedrelEmotes];

        emotesCache = allEmotes.map(e => {
            // 7TV CDN URL format: https://cdn.7tv.app/emote/{emote_id}/2x.webp
            const url = e.id ? `https://cdn.7tv.app/emote/${e.id}/2x.webp` : null;
            return { name: e.name, url };
        }).filter(e => e.url);

        console.log("Total emotes fetched:", emotesCache.length);
    } catch (err) {
        console.error("Failed to fetch emotes from sets:", err);
    }
}


    fetchEmotes();

    // ---------- 3️⃣ Chat elements ----------
    const chatInput = document.getElementById("chatInput");
    const chatMessages = document.getElementById("chatMessages");

    // ---------- 4️⃣ Handle Enter key ----------
    chatInput.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (!text) return;

            // Split by whitespace
            const words = text.split(/\s+/);

            words.forEach(word => {
                // Find emote by name (case-insensitive)
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
