document.addEventListener("DOMContentLoaded", () => {

    // ---------- 1️⃣ Emote cache ----------
    let emotesCache = [];

    // ---------- 2️⃣ Fetch 7TV global + LetsHugoTV + Caedrel sets ----------
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

    fetchEmotes();

    // ---------- 3️⃣ Chat elements ----------
    const chatInput = document.getElementById("chatInput");
    const chatMessages = document.getElementById("chatMessages");


    // ---------- 4️⃣ SEND MESSAGE (Enter key) ----------
    chatInput.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();

            const text = chatInput.value.trim();
            if (!text) return;

            const words = text.split(/\s+/);

            words.forEach(word => {
                // CASE SENSITIVE MATCH
                const emote = emotesCache.find(e => e.name === word);

                if (emote) {
                    const img = document.createElement("img");
                    img.src = emote.url;
                    img.className = "inline-block h-8 align-middle mr-1 emote";
                    img.style.marginBottom = "0.25rem";
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


    // =====================================================================
    // 5️⃣ AUTOCOMPLETE — EXACTLY LIKE CHATTERINO
    // =====================================================================

    let suggestionBox = document.createElement("div");
    suggestionBox.style.position = "absolute";
    suggestionBox.style.bottom = "60px";
    suggestionBox.style.left = "20px";
    suggestionBox.style.width = "300px";
    suggestionBox.style.maxHeight = "240px";
    suggestionBox.style.overflowY = "auto";
    suggestionBox.style.background = "rgba(0,0,0,0.85)";
    suggestionBox.style.border = "1px solid white";
    suggestionBox.style.borderRadius = "8px";
    suggestionBox.style.padding = "4px";
    suggestionBox.style.display = "none";
    suggestionBox.style.zIndex = "9999";
    document.body.appendChild(suggestionBox);

    chatInput.addEventListener("input", () => {
        const value = chatInput.value;

        // Detect ":" pattern ( :word )
        const match = value.match(/:(\w*)$/);
        if (!match) {
            suggestionBox.style.display = "none";
            return;
        }

        const typed = match[1].toLowerCase();

        // Filter ALL emotes (case-insensitive search)
        const results = emotesCache.filter(e =>
            e.name.toLowerCase().startsWith(typed)
        );

        if (results.length === 0) {
            suggestionBox.style.display = "none";
            return;
        }

        // Build suggestions
        suggestionBox.innerHTML = "";
        suggestionBox.style.display = "block";

        results.forEach(emote => {
            const item = document.createElement("div");
            item.style.padding = "4px";
            item.style.cursor = "pointer";
            item.style.display = "flex";
            item.style.alignItems = "center";

            item.innerHTML = `
                <img src="${emote.url}" style="height:24px;margin-right:6px;">
                <span style="color:white;">${emote.name}</span>
            `;

            // Click to insert
            item.onclick = () => {
                chatInput.value = value.replace(/:(\w*)$/, emote.name + " ");
                suggestionBox.style.display = "none";
                chatInput.focus();
            };

            suggestionBox.appendChild(item);
        });
    });

});
