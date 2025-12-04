const computerBtn  = document.getElementById("computerBtn");
const computerPanel = document.getElementById("computerPanel");
const computerClose = document.getElementById("computerClose");
const computerBack  = document.getElementById("computerBack");

const pageHome = document.getElementById("page-home");
const pageBogo = document.getElementById("page-bogo");
const pageNextDay = document.getElementById("page-nextday");
const pagePrevDay = document.getElementById("page-prevday");


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
    pageNextDay.classList.add("hidden");
    pagePrevDay.classList.add("hidden");

    computerBack.classList.add("hidden");

    if (name === "home") {
        pageHome.classList.remove("hidden");
    } else if (name === "bogo") {
        pageBogo.classList.remove("hidden");
        computerBack.classList.remove("hidden");
    } else if (name === "nextday") {
        pageNextDay.classList.remove("hidden");
        computerBack.classList.remove("hidden");
    } else if (name === "prevday") {
        pagePrevDay.classList.remove("hidden");
        computerBack.classList.remove("hidden");
    }
}

// OPEN BOGO
document.getElementById("bogoSortBtn").onclick = () => {
    showPage("bogo");
};

// OPEN NEXT DAY CALCULATOR
document.getElementById("nextDayBtn").onclick = () => {
    showPage("nextday");
};

// OPEN PREVIOUS DAY CALCULATOR
document.getElementById("prevDayBtn").onclick = () => {
    showPage("prevday");
};

// BACK
computerBack.onclick = () => {
    showPage("home");
};


// BOGOSORT
import * as sorts from './sort.js';

const visualizerSort = document.getElementById('visualizer-sort');
const numInputSort = document.getElementById('numInput-sort');
const startBtnSort = document.getElementById('startBtn-sort');
const stopBtnSort = document.getElementById('stopBtn-sort');
const speedSliderSort = document.getElementById('speedSlider-sort');
const speedLabelSort = document.getElementById('speedLabel-sort');
const algoSelectSort = document.getElementById('algoSelect-sort');

let stopRequested = false;
let running = false;


if (stopBtnSort) stopBtnSort.disabled = true;


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
        const algo = (algoSelectSort && algoSelectSort.value) ? algoSelectSort.value : 'visualBogoSort';
        if (arr.some(n => Number.isNaN(n))) return console.error('Invalid number in input');

        const delay = (speedSliderSort && speedSliderSort.value) ? Number(speedSliderSort.value) : 20;
        stopRequested = false;
        running = true;
        startBtnSort.disabled = true;
        if (stopBtnSort) stopBtnSort.disabled = false;

        // Call chosen algorithm (must match exported function names from bogoSort.js)
        const fn = sorts[algo];
        if (typeof fn === 'function') {
            await fn(arr, visualizerSort, delay, () => stopRequested);
        } else {
            console.error('Selected algorithm not found:', algo);
        }

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


<<<<<<< HEAD
//Descriptions
const algoDescSort = document.getElementById('algoDesc-sort');

const algoDescriptions = {
  visualBogoSort: '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0---BogoSort---\n Randomize the Array and check if its sorted, if not, do it again. \n Time complexity: \n Average: O(n * n!) \n Best Case: O(1) \n Worst Case: O(∞)',
  visualBubbleSort: 'Bubble Sort: repeatedly compares and swaps adjacent elements — O(n²), easy to visualize.',
  visualQuickSort: 'Quick Sort: divide-and-conquer using a pivot, average O(n log n).',
  visualStalinSort: 'Stalin Sort: removes any element that breaks the sorted order — destructive and amusing.',
  visualMiracleSort: 'Miracle Sort: experimental / recursive check (may recurse indefinitely).'
};

function updateAlgoDesc() {
  if (!algoDescSort) return;
  const key = (algoSelectSort && algoSelectSort.value) ? algoSelectSort.value : '';
  algoDescSort.textContent = algoDescriptions[key] || '';
}

// attach listener and initialize
if (algoSelectSort) {
  algoSelectSort.addEventListener('change', updateAlgoDesc);
  updateAlgoDesc();
}
=======
// next day calc
const calculateBtn = document.getElementById('calculateBtn');
const resultDiv = document.getElementById('result');

if (calculateBtn) {
    calculateBtn.addEventListener('click', () => {
        const today = new Date();
        const todayDay = today.getDay();
        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const nextDay = (todayDay + 1) % 7;
        const nextDayName = weekdays[nextDay];

        resultDiv.textContent = `${nextDayName}`;
    });
}

// previous day calc
const calculatePrevBtn = document.getElementById('calculatePrevBtn');
const resultPrevDiv = document.getElementById('resultPrev');

if (calculatePrevBtn) {
    calculatePrevBtn.addEventListener('click', () => {
        const today = new Date();
        const todayDay = today.getDay();
        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const prevDay = (todayDay - 1 + 7) % 7;
        const prevDayName = weekdays[prevDay];

        resultPrevDiv.textContent = `${prevDayName}`;
    });
}

>>>>>>> Lolo


//Descriptions
const algoDescSort = document.getElementById('algoDesc-sort');

const algoDescriptions = {
  visualBogoSort: '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0---BogoSort---\n Randomize the Array and check if its sorted, if not, do it again. \n Time complexity: \n Average: O(n * n!) \n Best Case: O(1) \n Worst Case: O(∞)',
  visualBubbleSort: 'Bubble Sort: repeatedly compares and swaps adjacent elements — O(n²), easy to visualize.',
  visualQuickSort: 'Quick Sort: divide-and-conquer using a pivot, average O(n log n).',
  visualStalinSort: 'Stalin Sort: removes any element that breaks the sorted order — destructive and amusing.',
  visualMiracleSort: 'Miracle Sort: experimental / recursive check (may recurse indefinitely).'
};

function updateAlgoDesc() {
  if (!algoDescSort) return;
  const key = (algoSelectSort && algoSelectSort.value) ? algoSelectSort.value : '';
  algoDescSort.textContent = algoDescriptions[key] || '';
}

// attach listener and initialize
if (algoSelectSort) {
  algoSelectSort.addEventListener('change', updateAlgoDesc);
  updateAlgoDesc();
}