import { send7tvEmote, sendMessage } from "../scripts.js";

document.addEventListener("DOMContentLoaded", () => {

    // ---------- Emote cache ----------
    let emotesCache = [];
    let filteredEmotes = [];

    // --------- Emote Fetching ----------
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
        renderEmotePanel();
    });


    const chatInput = document.getElementById("chatInput");
    const chatMessages = document.getElementById("chatMessages");



let autocompleteJustSelected = false;

//arrowkeys
chatInput.addEventListener("keydown", (e) => {
    if (suggestionBox.style.display === "block" && suggestionItems.length > 0) {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            let next = (selectedSuggestion + 1) % suggestionItems.length;
            setSelectedSuggestion(next);
            suggestionItems[next].scrollIntoView({ block: "nearest" });
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            let prev = (selectedSuggestion - 1 + suggestionItems.length) % suggestionItems.length;
            setSelectedSuggestion(prev);
            suggestionItems[prev].scrollIntoView({ block: "nearest" });
        } else if (e.key === "Enter") {
            if (selectedSuggestion >= 0 && suggestionItems[selectedSuggestion]) {
                suggestionItems[selectedSuggestion].click();
                e.preventDefault();
                autocompleteJustSelected = true;
            }
        } else if (e.key === "Escape") {
            suggestionBox.style.display = "none";
            suggestionItems = [];
            selectedSuggestion = -1;
        }
    }
});

    // emote suggestion box

    let suggestionBox = document.createElement("div");
    const rect = chatInput.getBoundingClientRect();
    const boxHeight = 200;
    suggestionBox.style.left = rect.left + window.scrollX + "px";
    suggestionBox.style.top = (rect.top + window.scrollY - boxHeight) + "px";
    suggestionBox.style.minWidth = rect.width + "px";
    suggestionBox.style.position = "absolute";   
    suggestionBox.style.maxWidth = "220px";      
    suggestionBox.style.width = "220px";       
    suggestionBox.style.fontSize = "0.95rem";    
    suggestionBox.style.background = "rgba(30,30,40,0.8)";
    suggestionBox.style.border = "1px solid #888";
    suggestionBox.style.borderRadius = "0.5rem";
    suggestionBox.style.zIndex = "9999";
    suggestionBox.style.boxShadow = "0 4px 16px rgba(0,0,0,0.25)";
    suggestionBox.style.maxHeight = "200px";
    suggestionBox.style.overflowY = "auto";
    suggestionBox.style.padding = "4px 0";
    suggestionBox.style.fontSize = "1rem";
    suggestionBox.style.display = "none";
    suggestionBox.style.overflowX = "hidden";
    suggestionBox.style.overflowY = "hidden";
    document.body.appendChild(suggestionBox); 

    let suggestionItems = [];
    let selectedSuggestion = -1;

    function updateSuggestionBox() {
        const value = chatInput.value;
        const match = value.match(/:(\w*)$/);
        if (!match) {
            suggestionBox.style.display = "none";
            suggestionItems = [];
            selectedSuggestion = -1;
            return;
        }

    // Update position
    const rect = chatInput.getBoundingClientRect();
    suggestionBox.style.left = rect.left + window.scrollX + "px";
    suggestionBox.style.display = "block";
    suggestionBox.style.maxHeight = "200px";
    suggestionBox.style.minWidth = rect.width + "px";
        // Update position every time the box is shown
        suggestionBox.style.left = rect.left + window.scrollX + "px";
        suggestionBox.style.display = "block";
        suggestionBox.style.maxHeight = "200px";
        suggestionBox.style.minWidth = rect.width + "px";

        // After filling the box with items:
        setTimeout(() => {
            const actualHeight = suggestionBox.offsetHeight;
            suggestionBox.style.top = (rect.top + window.scrollY - actualHeight) + "px";
        }, 0);

        const typed = match[1].toLowerCase();
        const results = emotesCache.filter(e =>
            e.name.toLowerCase().startsWith(typed)
        );

        if (results.length === 0) {
            suggestionBox.style.display = "none";
            suggestionItems = [];
            selectedSuggestion = -1;
            return;
        }

        suggestionBox.innerHTML = "";
        suggestionBox.style.display = "block";
        suggestionItems = [];

        results.forEach((emote, idx) => {
            const item = document.createElement("div");
            item.style.padding = "4px";
            item.style.cursor = "pointer";
            item.style.display = "flex";
            item.style.alignItems = "center";
            item.innerHTML = `
                <img src="${emote.url}" style="height:24px;margin-right:6px;">
                <span style="color:white;">${emote.name}</span>
            `;
            item.onmouseenter = () => {
                setSelectedSuggestion(idx);
            };
            item.onclick = () => {
                chatInput.value = value.replace(/:(\w*)$/, emote.name + " ");
                suggestionBox.style.display = "none";
                suggestionItems = [];
                selectedSuggestion = -1;
                chatInput.focus();
            };
            suggestionBox.appendChild(item);
            suggestionItems.push(item);
        });

        setSelectedSuggestion(0); 
    }

    function setSelectedSuggestion(idx) {
        suggestionItems.forEach((item, i) => {
            item.style.background = i === idx ? "#444" : "transparent";
        });
        selectedSuggestion = idx;
    }

    chatInput.addEventListener("input", updateSuggestionBox);

function renderEmotePanel() {
    const grid = document.getElementById("emoteGrid");
    if (!grid) return;

    grid.innerHTML = "";

    filteredEmotes.forEach(emote => {
        const img = document.createElement("img");
        img.src = emote.url;
        img.title = emote.name;

        // fixed
        img.className = "max-h-10 w-auto cursor-pointer hover:scale-110 transition";

        img.addEventListener("click", () => {
            send7tvEmote(emote.name);
        });

        grid.appendChild(img);
    });
}


const emoteSearch = document.getElementById("emoteSearch");

emoteSearch.addEventListener("input", () => {
    const text = emoteSearch.value.toLowerCase();

    filteredEmotes = emotesCache.filter(e =>
        e.name.toLowerCase().includes(text)
    );

    renderEmotePanel();
});


});


