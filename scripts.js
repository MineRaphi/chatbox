// This renderer script now communicates with the main process for socket events.
console.log('Renderer: setting up socket IPC listeners')

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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

    window.electronSocket.onError(async (error) => {
        console.error('Socket connection error:', error);
        document.getElementById("errorText").style.display = "block";
        await sleep(5000);
        document.getElementById("errorText").style.display = "none";
    });

    window.electronSocket.onRegisterSuccess(async () => {
        console.log("Registration successful! You can now log in.");
        document.getElementById("RegSuccess").style.display = "block";
    });

    window.electronSocket.onRegisterFailure(async (message) => {
        console.log("Registration failed: " + message);
        document.getElementById("RegError").innerText = message;
        document.getElementById("RegError").style.display = "block";
        await sleep(5000);
        document.getElementById("RegError").style.display = "none";
    });

    window.electronSocket.onLoginSuccess(() => {
        console.log("Login successful! Welcome.");
        window.location.href = "main.html";
    });

    window.electronSocket.onLoginFailure(async (message) => {
        console.log("Login failed: " + message);
        document.getElementById("LoginError").style.display = "block";
        await sleep(5000);
        document.getElementById("LoginError").style.display = "none";
    });

    const connectBtn = document.getElementById("connectBtn");
    if (connectBtn) {
        connectBtn.addEventListener("click", function() {
        const ip = document.getElementById("ip").value;
        const port = document.getElementById("port").value;
        window.electronSocket.tryServerConnect(ip, port);
    });
}

    const registerBtn = document.getElementById("registerBtn");
    if (registerBtn) {
        document.getElementById("registerBtn").addEventListener("click", async function() {
            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;
            const passwordConfirm = document.getElementById("confirmPassword").value;
            console.log("Registering user:", username);
            if (password !== passwordConfirm) {
                document.getElementById("RegError").innerText = "Passwords do not match!";
                document.getElementById("RegError").style.display = "block";
                await sleep(5000);
                document.getElementById("RegError").style.display = "none";
                return;
            }
            if (password === "" || username === "") {
                document.getElementById("RegError").innerText = "Username and password cannot be empty!";
                document.getElementById("RegError").style.display = "block";
                await sleep(5000);
                document.getElementById("RegError").style.display = "none";
                return;
            }
            window.electronSocket.register(username, password);
        });
    }

    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) {
        loginBtn.addEventListener("click", function() {
            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;
            console.log("Logging in user:", username);
            window.electronSocket.login(username, password);
        });
    }

    window.electronSocket.recieveChatMessage((data) => {
        console.log("Received data message:", data);
        convertTextToChatMessage(data.user + ": " + data.message);
    });
}
else {
    console.warn('electronSocket API not available. Are you running inside Electron with the preload script?')
}

export function send7tvEmote(emoteCode) {
    console.log("Sending 7TV emote:", emoteCode);
    console.log("Function still needs to be implemented."); // Placeholder for actual implementation
}

const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
function convertTextToChatMessage(text) {
    console.log("Converting text to chat message:", text);
    const textValue = text.trim();
    if (!textValue) return;

    const words = textValue.split(/\s+/);

    let emotesCache = [];

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

export function sendMessage(message) {
    if (window.electronSocket) {
        console.log("Sending message:", message);
        window.electronSocket.sendChatMessage(message);
        convertTextToChatMessage(message);
    }
}