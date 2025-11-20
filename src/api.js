// Check if user is already logged in
    if (localStorage.getItem("token")) {
      console.log("User already logged in as", localStorage.getItem("username"));
      // Uncomment below to redirect to main app page
      // window.location = "app.html";
    }

    // Mock users database
    const mockUsers = [
      { username: "simi", password: "1234" },
      { username: "lolo", password: "1234" }
    ];

    // Mock API
    const API = {
      login(username, password) {
        return new Promise((resolve) => {
          setTimeout(() => {
            const user = mockUsers.find(u => u.username === username);

            if (!user) {
              resolve({ success: false, error: "User not found" });
              return;
            }

            if (user.password !== password) {
              resolve({ success: false, error: "Wrong password" });
              return;
            }

            resolve({ success: true, token: "FAKE-TOKEN-123" });
          }, 300); // simulate server delay
        });
      }
    };

    // Attach login button listener after DOM is loaded
    document.addEventListener("DOMContentLoaded", () => {
      const loginBtn = document.getElementById("loginBtn");

      loginBtn.onclick = async () => {
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;

        if (!username || !password) {
          document.getElementById("error").textContent = "Fill in all fields";
          return;
        }

        const res = await API.login(username, password);

        if (res.success) {
          localStorage.setItem("token", res.token);     // store session token
          localStorage.setItem("username", username);   // store username
          window.location.href = "main.html"; 
        } else {
          document.getElementById("error").textContent = res.error;
        }
      };
    });