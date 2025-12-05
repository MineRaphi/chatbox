// check if array is sorted
export function isSorted(arr) {
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] < arr[i - 1]) return false;
    }
    return true;
}

// shuffles array
export function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Visual Bogo Sort
export async function visualBogoSort(arr, visualizer, delay, stopCallback = () => false) {
    while (!isSorted(arr)) {
        if (stopCallback()) break; 
        shuffle(arr);
        renderArray(arr, visualizer);
        await new Promise(r => setTimeout(r, delay));
    }
}

// Renders the array as bars in the visualizer
function renderArray(arr, visualizer) {
    visualizer.innerHTML = '';
    arr.forEach(n => {
        const bar = document.createElement('div');
        bar.style.height = `${n * 10}px`;
        bar.style.width = '20px';
        bar.style.backgroundColor = 'grey';
        bar.style.margin = '0 2px';
        visualizer.appendChild(bar);
    });
}

// Visual Bubble Sort
export async function visualBubbleSort(arr, visualizer, delay, stopCallback = () => false) {
    const a = arr;
    for (let i = 0; i < a.length; i++) {
        let swapped = false;
        for (let j = 0; j < a.length - 1 - i; j++) {
            if (stopCallback()) return;
            if (a[j] > a[j + 1]) {
                [a[j], a[j + 1]] = [a[j + 1], a[j]];
                swapped = true;
                renderArray(a, visualizer);
                await new Promise(r => setTimeout(r, delay));
            }
        }
        if (!swapped) break;
    }
}

//Visual Quick Sort
export async function visualQuickSort(arr, visualizer, delay, stopCallback = () => false) {
    const a = arr;

    async function quickSort(l, r) {
        if (stopCallback()) return;
        if (l >= r) return;

        let pivot = a[Math.floor((l + r) / 2)];
        let i = l;
        let j = r;

        while (i <= j) {
            while (a[i] < pivot) i++;
            while (a[j] > pivot) j--;

            if (i <= j) {
                [a[i], a[j]] = [a[j], a[i]];

                // Visual update
                renderArray(a, visualizer);
                await new Promise(r => setTimeout(r, delay));

                i++;
                j--;
            }
            if (stopCallback()) return;
        }

        if (l < j) await quickSort(l, j);
        if (i < r) await quickSort(i, r);
    }

    await quickSort(0, a.length - 1);

    // final render
    renderArray(a, visualizer);
}


// Visual Stalin Sort
export async function visualStalinSort(arr, visualizer, delay, stopCallback = () => false) {
    let a = arr;
    let result = [a[0]]; 

    renderArray(result, visualizer);
    await new Promise(r => setTimeout(r, delay));

    for (let i = 1; i < a.length; i++) {
        if (stopCallback()) return;

        const last = result[result.length - 1];

        if (a[i] >= last) {
            // It survives
            result.push(a[i]);
        } 
        // else: it gets purged (we simply don't push it)

        renderArray(result, visualizer);
        await new Promise(r => setTimeout(r, delay));
    }

    // Mutate original array to match final result (if needed)
    arr.length = 0;
    for (let x of result) arr.push(x);

    renderArray(arr, visualizer);
}

export async function visualMiracleSort(arr, visualizer, delay, stopCallback = () => false) {
    let a = arr;

    renderArray(a, visualizer);
    // Simple check loop — use correct "length" and ensure we don't compare past the end
    for (let i = 0; i < a.length - 1; i++) {
        if (stopCallback()) return;
        if (a[i] > a[i + 1]) {
            // Log the first out-of-order pair we find
            console.log('not sorted at index', i, a[i], '>', a[i + 1]);

            // recurse (await) to follow the original intent — this will eventually
            // cause a stack overflow if the algorithm keeps recursing, as you noted.
            await visualMiracleSort(arr, visualizer, delay, stopCallback);
            return;
        }

        // small pause to allow rendering/stop checks to be effective
        await new Promise(r => setTimeout(r, delay));
    }

    // final render
    renderArray(a, visualizer);
}
