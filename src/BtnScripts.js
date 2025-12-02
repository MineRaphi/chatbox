const openBtn  = document.getElementById("computerBtn");
const panel    = document.getElementById("computerPanel");
const closeBtn = document.getElementById("computerClose");

openBtn.onclick = () => {
    panel.classList.add("show");
};

closeBtn.onclick = () => {
    panel.classList.remove("show");
};
