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
// BOGOSORT
import { visualBogoSort } from './bogoSort.js';

const visualizerSort = document.getElementById('visualizer-sort');
const numInputSort = document.getElementById('numInput-sort');
const startBtnSort = document.getElementById('startBtn-sort');
const stopBtnSort = document.getElementById('stopBtn-sort');
const speedSliderSort = document.getElementById('speedSlider-sort');
const speedLabelSort = document.getElementById('speedLabel-sort');

let stopRequested = false;
let running = false;

// disable stop until a run starts
if (stopBtnSort) stopBtnSort.disabled = true;

// initialize speed label and live update
if (speedSliderSort && speedLabelSort) {
    speedLabelSort.textContent = `${speedSliderSort.value} ms`;
    speedSliderSort.oninput = () => {
        speedLabelSort.textContent = `${speedSliderSort.value} ms`;
    };
}

if (startBtnSort) {
    startBtnSort.addEventListener('click', async () => {
        if (running) return;
        if (!numInputSort) return console.error('numInput-sort element not found');
        if (!visualizerSort) return console.error('visualizer-sort element not found');

        const values = numInputSort.value.trim();
        if (!values) return console.warn('No numbers entered');

        const arr = values.split(',').map(s => Number(s.trim()));
        if (arr.some(n => Number.isNaN(n))) return console.error('Invalid number in input');

        const delay = (speedSliderSort && speedSliderSort.value) ? Number(speedSliderSort.value) : 20;
        stopRequested = false;
        running = true;
        startBtnSort.disabled = true;
        if (stopBtnSort) stopBtnSort.disabled = false;

        await visualBogoSort(arr, visualizerSort, delay, () => stopRequested);

        running = false;
        startBtnSort.disabled = false;
        if (stopBtnSort) stopBtnSort.disabled = true;
    });
} else {
    console.warn('startBtn-sort element not found; start handler not attached');
}

if (stopBtnSort) {
    stopBtnSort.onclick = () => {
        stopRequested = true;
    };
}
