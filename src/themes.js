export function setTheme(themeName, updatePreference = true) {
    console.log("Setting theme to:", themeName);
    document.body.classList.remove("purple", "red");
    document.body.classList.add(themeName);
    if (updatePreference) {
        window.electronSocket.changePreference("theme", themeName);
    }
}

setTheme("purple", false); // Default theme on load

document.getElementById("purpleBtn")?.addEventListener("click", () => setTheme("purple"));
document.getElementById("redBtn")?.addEventListener("click", () => setTheme("red"));

