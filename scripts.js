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

    window.electronSocket.onRegisterSuccess(() => {
        alert("Registration successful! You can now log in.");
        window.location.href = "login.html";
    });

    window.electronSocket.onRegisterFailure((message) => {
        alert("Registration failed: " + message);
    });

    window.electronSocket.onLoginSuccess(() => {
        alert("Login successful! Welcome.");
        window.location.href = "main.html";
    });

    window.electronSocket.onLoginFailure((message) => {
        alert("Login failed: " + message);
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
        document.getElementById("registerBtn").addEventListener("click", function() {
            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;
            const passwordConfirm = document.getElementById("confirmPassword").value;
            console.log("Registering user:", username);
            if (password !== passwordConfirm) {
                alert("Passwords do not match!");
                return;
            }
            if (password === "" || username === "") {
                alert("Username and password cannot be empty!");
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
