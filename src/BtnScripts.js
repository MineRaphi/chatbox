const openBtn  = document.getElementById("computerBtn");
const panel    = document.getElementById("computerPanel");
const closeBtn = document.getElementById("computerClose");

openBtn.onclick = () => {
    const rect = openBtn.getBoundingClientRect();

    panel.style.transformOrigin = 
        `${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px`;

    panel.classList.add("show");
};

closeBtn.onclick = () => {
    panel.classList.remove("show");
};
