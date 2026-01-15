import { setTheme } from './src/themes.js';

// This renderer script now communicates with the main process for socket events.
console.log('Renderer: setting up socket IPC listeners')

// Utility function to pause execution for a given time
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

if (window.electronSocket) {
    window.electronSocket.loadPreferences();

    // When the socket connects successfully, navigate to login page
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

        if (document.getElementById("startPage") != null) {
            window.location.href = "src/login.html";
        }
        else {
            window.location.href = "login.html";
        }
    })

    // When the socket disconnects, log the reason
    window.electronSocket.onDisconnect((reason) => {
        console.log('socket disconnected:', reason)
    })

    // Handle socket errors by displaying an error message temporarily
    window.electronSocket.onError(async (error) => {
        console.error('Socket connection error:', error);
        document.getElementById("errorText").style.display = "block";
        await sleep(5000);
        document.getElementById("errorText").style.display = "none";
    });

    // Handle successful user registration by displaying a success message
    window.electronSocket.onRegisterSuccess(async () => {
        console.log("Registration successful! You can now log in.");
        document.getElementById("RegSuccess").style.display = "block";
    });

    // Handle failed user registration by displaying an error message
    window.electronSocket.onRegisterFailure(async (message) => {
        console.log("Registration failed: " + message);
        document.getElementById("RegError").innerText = message;
        document.getElementById("RegError").style.display = "block";
        await sleep(5000);
        document.getElementById("RegError").style.display = "none";
    });

    // Handle successful user login by navigating to the main application page
    window.electronSocket.onLoginSuccess(() => {
        console.log("Login successful! Welcome.");
        window.location.href = "main.html";
    });

    // Handle failed user login by displaying an error message
    window.electronSocket.onLoginFailure(async (message) => {
        console.log("Login failed: " + message);
        document.getElementById("LoginError").style.display = "block";
        await sleep(5000);
        document.getElementById("LoginError").style.display = "none";
    });

    // Handle preferences loaded event
    window.electronSocket.onPreferencesLoaded((data) => {
        console.log("Preferences loaded:", data);
        // Update UI with loaded preferences
        setTheme(data.theme, false);
        // Connect with Server automatically
        if (document.getElementById("startPage") != null && data.serverIP != null && data.serverPort != null) {
            window.electronSocket.tryServerConnect(data.serverIP, data.serverPort);
        }
        if (document.getElementById("loginPage") != null && data.username != null && data.password != null) {
            window.electronSocket.login(data.username, data.password);
        }
    });

    // Set up connect button event listener
    const connectBtn = document.getElementById("connectBtn");
    if (connectBtn) {
        connectBtn.addEventListener("click", function() {
            const ip = document.getElementById("ip").value;
            const port = document.getElementById("port").value;
            const stayConnected = document.getElementById("reconnectSelector").checked;
            if (stayConnected) {
                window.electronSocket.changePreference("serverIP", ip);
                window.electronSocket.changePreference("serverPort", port);
            }
            else {
                window.electronSocket.changePreference("serverIP", null);
                window.electronSocket.changePreference("serverPort", null);
            }
            window.electronSocket.tryServerConnect(ip, port);
        });
    }

    // Set up register button event listener
    const registerBtn = document.getElementById("registerBtn");
    if (registerBtn) {
        document.getElementById("registerBtn").addEventListener("click", async function() {
            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;
            const passwordConfirm = document.getElementById("confirmPassword").value;
            console.log("Registering user:", username);
            // Validate password confirmation
            if (password !== passwordConfirm) {
                document.getElementById("RegError").innerText = "Passwords do not match!";
                document.getElementById("RegError").style.display = "block";
                await sleep(5000);
                document.getElementById("RegError").style.display = "none";
                return;
            }
            // Validate non-empty username and password
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

    // Set up login button event listener
    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) {
        loginBtn.addEventListener("click", function() {
            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;
            console.log("Logging in user:", username)
            const stayLoggedin = document.getElementById("autoLoginSelector").checked;
            if (stayLoggedin) {
                window.electronSocket.changePreference("username", username);
                window.electronSocket.changePreference("password", password);
            }
            else {
                window.electronSocket.changePreference("username", null);
                window.electronSocket.changePreference("password", null);
            }
            window.electronSocket.login(username, password);
        });
    }

    const changeServerBtn = document.getElementById("changeServerBtn");
    if (changeServerBtn) {
        changeServerBtn.addEventListener("click", function() {
            window.electronSocket.changePreference("serverIP", null);
            window.electronSocket.changePreference("serverPort", null);
            window.location.href="server.html";
        });
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function() {
            window.electronSocket.changePreference("username", null);
            window.electronSocket.changePreference("password", null);
            sleep(500);
            window.location.href="login.html";
        });
    }

    const logoutAndChangeServerBtn = document.getElementById("logoutAndChangeServerBtn");
    if (logoutAndChangeServerBtn) {
        logoutAndChangeServerBtn.addEventListener("click", function() {
            window.electronSocket.changePreference("serverIP", null);
            window.electronSocket.changePreference("serverPort", null);
            window.electronSocket.changePreference("username", null);
            window.electronSocket.changePreference("password", null);
            window.location.href="server.html";
        });
    }
}
else {
    console.warn('electronSocket API not available. Are you running inside Electron with the preload script?')
}

// Function to send a 7tv emote via the main process
export function send7tvEmote(emoteId) {
    window.electronSocket.send7tvEmote(emoteId);
}
