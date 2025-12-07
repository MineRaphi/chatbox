const computerBtn  = document.getElementById("computerBtn");
const computerPanel = document.getElementById("computerPanel");
const computerClose = document.getElementById("computerClose");
const computerBack  = document.getElementById("computerBack");

const pageHome = document.getElementById("page-home");
const pageBogo = document.getElementById("page-bogo");
const pageNextDay = document.getElementById("page-nextday");
const pagePrevDay = document.getElementById("page-prevday");

const vincentBtn  = document.getElementById("vincentBtn");
const pageVincent = document.getElementById("page-vincent");


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
    pageVincent.classList.add("hidden");

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
    } else if (name === "vincentPage") {
        pageVincent.classList.remove("hidden");
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

// OPEN VINCENT PAGE
vincentBtn.onclick = () => {
    showPage("vincentPage");
};

// BACK
computerBack.onclick = () => {
    showPage("home");
};


// bogosort
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



//Descriptions
const algoDescSort = document.getElementById('algoDesc-sort');

const algoDescriptions = {
  visualBogoSort: '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0---BogoSort---\n Randomize the Array and check if its sorted, if not, do it again. \n Time complexity: \n Average: O(n * n!) \n Best Case: O(1) \n Worst Case: O(∞)',
  visualBubbleSort: '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0---BubbleSort---\n Repeatetly compare and swap adjacent elements \n Time complexity: O(n^2)',
  visualQuickSort: '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0---QuickSort---\n One of the fastest and efficient sorting algorthims. divide-and-conquer using a pivot. \n Time complexity: O(n log n)',
  visualStalinSort: 'Stalin Sort: removes any element that breaks the sorted order — destructive and amusing.',
  visualMiracleSort: 'Miracle Sort: experimental / recursive check (may recurse indefinitely).'
};

// Update description based on selected algorithm
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

//Vincetisteinschlechterjungler
const vincentSelect = document.getElementById("vincentSelect");
const vincentText = document.getElementById("vincentText");

if (vincentSelect) {
  vincentSelect.addEventListener("change", () => {
    if (vincentSelect.value === "vinfo1") {
      vincentText.textContent = vinfo1;
    } else if (vincentSelect.value === "vinfo2") {
      vincentText.textContent = vinfo2;
    } else {
      vincentText.textContent = "";
    }
  });
}


//Vincent TXT files

// Vincent texts
const vinfo1 = `
0:00 pot gekauft
0:00 Goofy kamera offset
2:12 terrible Krugs kiting
3:10 zuerst blue und dann gromp gemacht
4:00 zeit verschwendet mit useless bot gank instead of recall
4:45 late für Krugs
5:40 2 camps top side into crab into gank top -> bad
6:30 warum drake contest instead of farm?
6:50 late für red buff respawn
7:21 clear bei Krugs gestartet und nicht red buff
8:23 useless time waste with mid gank + Flash waste instead of farming bot side into unsuccesful invade of enemy top side
9:10 doing grubs with no mid prio instead of farming bot side (time waste)
9:45 dies after unsuccesful top gank (even more time waste)
10:15 goes to grubs instead of farming his entire jgl starting from top side (52cs min 10)
11:56 wolf smite although drake is up -> no smite for drake
12:00 blue before gromp again
13:30 dies to jhin after wasting an infinite amount of time walking around drake
14:12 starts clear at Krugs again and not at red buff
14:33 uses smite again allthough herald is about to spawn -> second smite cd 50 sec
15:00 time waste mid instead of farming bot side + dies to Diana
15:50 runs to herald and not to farm his bot side and get drake because of bot prio -> herald bad because no mid prio
16:30 useless invade/dive attempt
17:08 wasted herald top + dies to garen
17:40 99cs
18:15 wastes time mid lane for nothing literally allthough every camp up
18:51 dies to jhin for no reason because overextend
21:30 terrible fight
21:47 dies to Diana for no reason after going onto her again
23:15 runs mid lane for no reason instead of farming bot side
23:50 still wasting time mid lane instead of getting drake or atakhan
24:20 dies to Diana for no reason instead of doing anything productive like farming bot side or getting drake/atakhan
25:20 runs bot side for no reason (cuz no camps up and atakhan gone) instead of farming top side camps
26:40 starts clear at Krugs AGAIN instead of red buff
27:30 151 cs
27:42 engages on galio and dies instead of going on Diana/other champ that was low
29:00 wastes Flash mid lane and dies to garen for no reason instead of farming
30:00 dies for no reason idkidkidk
30:15 writes ggwp and rep bot

Overall terrible kiting
`;

const vinfo2 = `
0:00 pot gekauft
0:00 flash auf falscher taste
0:00 75fps???
2:55 smite auf red buff geused, with no knowledge of enemy pathing+
4:30 goes for second crab, allthough seeing that yone moves to crab -> late for second clear
5:38 q on non existent red buff?? -> schizo
6:20 starts drake after wasting time allthough seeing lee top
7:27 not looking bot at lee sin buffs, possible invade missed
7:25 starting gromp not blue
8:00 starting grubs after clearing gromp + blue instead of only blue and then grubs
8:40 tries to 1v1 master yi + yuumi for no reason + bad flash -> late for clear
9:15 goes to wolves instead reversing clear for synced camp respawn
9:45 starts red buff instead of krugs -> camp respawn fucked
10:25 invades with no vision/knowledge of enemy camps -> no jungle tracking
11:05 goes into enemy jungle for no reason instead of crab and camps
12:24 goes drake instead of krugs -> drake still wouldnt be gone after krugs -> camp respawn even more fucked
12:30 - 13:00 dies for idk reason + complains about damage
14:00 goes to invade for no reason (no vision etc) and dies instead of clearing camps
15:10 cancles auto twice on big wolf
15:31 flash for no reason
15:42 goes into enemy jungle and dies instead of clearing own bot side???
16:48 goes raptors after red instead of krugs and then raptors to fix sync
17:12 goes into enemy botside for no reason instead of farming top side -> wasted time 
17:53 schizo ult
18:09 goes into enemy bot side into a loosing fight instead of base and farm top side
18:44 starts clear at gromp instead of waiting 2 seconds for blue spawn -> even more fucked
18:48 didnt go for crab before clear
20:10 goes top side into yone (knowing that) instead of bot side to contest atakhan
20:40 goes top to def tower instead of contest atakhan + misses flash q and almost looses 1v1
22:45 goes top side to wait for gromp  (afk farm) instead of atakhan, which is still up btw and dies to yone at top t2
24:23 starts clear at grompo and not blue
25:00 goes krugs instead of contesting drake with, enemy jungle was not there
25:44 finally goes to fucking atakhan
26:45 farms gromp instead of helping in enemy base
`;
