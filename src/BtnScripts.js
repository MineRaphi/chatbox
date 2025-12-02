const computerBtn  = document.getElementById("computerBtn");
const computerPanel = document.getElementById("computerPanel");
const computerClose = document.getElementById("computerClose");
const computerBack  = document.getElementById("computerBack");

const pageHome = document.getElementById("page-home");
const pageBogo = document.getElementById("page-bogo");


computerBtn.onclick = () => {
    const rect = computerBtn.getBoundingClientRect();
    computerPanel.style.transformOrigin =
        `${rect.left + rect.width/2}px ${rect.top + rect.height/2}px`;
    computerPanel.classList.add("show");


    showPage("home");
};

// CLOSE
computerClose.onclick = () => {
    computerPanel.classList.remove("show");
};


function showPage(name) {

    pageHome.classList.add("hidden");
    pageBogo.classList.add("hidden");

    computerBack.classList.add("hidden");

    if (name === "home") {
        pageHome.classList.remove("hidden");
    } else if (name === "bogo") {
        pageBogo.classList.remove("hidden");
        computerBack.classList.remove("hidden");
    }
}

// OPEN BOGO
document.getElementById("bogoSortBtn").onclick = () => {
    showPage("bogo");
};

// BACK
computerBack.onclick = () => {
    showPage("home");
};


// BOGOSORT
import { visualBogoSort } from './bogoSort.js';

const visualizer = document.getElementById('visualizer');
const input = document.getElementById('numInput');
const startBtn = document.getElementById('startBtn');

startBtn.onclick = () => {
  const arr = input.value.split(',').map(Number);
  visualBogoSort(arr, visualizer);
};
