
export function isSorted(arr) {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < arr[i - 1]) return false;
  }
  return true;
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function visualBogoSort(arr, visualizer, delay = 200, stopCallback = () => false) {
  while (!isSorted(arr)) {
    if (stopCallback()) break; // stop if requested
    shuffle(arr);
    renderArray(arr, visualizer);
    await new Promise(r => setTimeout(r, delay));
  }
}


function renderArray(arr, visualizer) {
  visualizer.innerHTML = '';
  arr.forEach(n => {
    const bar = document.createElement('div');
    bar.style.height = `${n * 10}px`;
    bar.style.width = '20px';
    bar.style.backgroundColor = 'purple';
    bar.style.margin = '0 2px';
    visualizer.appendChild(bar);
  });
}
