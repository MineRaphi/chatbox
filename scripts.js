import { setTheme } from './src/themes.js';

// This renderer script now communicates with the main process for socket events.
console.log('Renderer: setting up socket IPC listeners')

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

if (window.electronSocket) {
    window.electronSocket.loadPreferences();

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

    window.electronSocket.onPreferencesLoaded((data) => {
        console.log("Preferences loaded:", data);
        // Update UI with loaded preferences
        setTheme(data.theme, false);
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
}
else {
    console.warn('electronSocket API not available. Are you running inside Electron with the preload script?')
}

export function send7tvEmote(emoteId) {
    window.electronSocket.send7tvEmote(emoteId);
}
