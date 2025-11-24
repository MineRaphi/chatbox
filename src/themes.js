function setTheme(themeName) {
  document.body.classList.remove("purple", "red");
  document.body.classList.add(themeName);
}

setTheme("red");

document.getElementById("purpleBtn")?.addEventListener("click", () => setTheme("purple"));
document.getElementById("redBtn")?.addEventListener("click", () => setTheme("red"));

