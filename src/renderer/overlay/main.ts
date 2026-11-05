import type { OverlayEmote } from '../../shared/ipc';
import './overlay.css';

const MAX_ON_SCREEN = 5;
const MARGIN_RATIO = 0.05;
const RECENT_POSITIONS = 3;
const POSITION_TRIES = 12;
const POP_MS = 350;
const FADE_MS = 1_000;
const LOAD_TIMEOUT_MS = 4_000;

interface Point {
  x: number;
  y: number;
}

const onScreen: HTMLImageElement[] = [];
const recent: Point[] = [];

function randomPosition(size: number): Point {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const mx = w * MARGIN_RATIO;
  const my = h * MARGIN_RATIO;
  const pick = (): Point => ({
    x: mx + Math.random() * Math.max(0, w - size - 2 * mx),
    y: my + Math.random() * Math.max(0, h - size - 2 * my),
  });

  // Prefer a spot that doesn't overlap the last few emotes.
  let best = pick();
  for (let i = 0; i < POSITION_TRIES; i++) {
    const clear = recent.every(
      (p) => Math.hypot(p.x - best.x, p.y - best.y) > size,
    );
    if (clear) break;
    best = pick();
  }

  recent.push(best);
  if (recent.length > RECENT_POSITIONS) recent.shift();
  return best;
}

function remove(img: HTMLImageElement): void {
  const i = onScreen.indexOf(img);
  if (i !== -1) onScreen.splice(i, 1);
  img.remove();
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(
      () => reject(new Error('timeout')),
      LOAD_TIMEOUT_MS,
    );
    img.addEventListener(
      'load',
      () => {
        clearTimeout(timer);
        resolve(img);
      },
      { once: true },
    );
    img.addEventListener(
      'error',
      () => {
        clearTimeout(timer);
        reject(new Error('load failed'));
      },
      { once: true },
    );
    img.src = url;
  });
}

async function show(emote: OverlayEmote): Promise<void> {
  let img: HTMLImageElement;
  try {
    // Wait for the image so the pop animation never plays on an empty box.
    img = await loadImage(emote.url);
  } catch {
    return;
  }

  // Too many on screen: the oldest makes room (unless the limit is off).
  if (emote.limitOnScreen) {
    while (onScreen.length >= MAX_ON_SCREEN) remove(onScreen[0]!);
  }

  const { x, y } = randomPosition(emote.sizePx);
  img.className = 'emote';
  img.alt = '';
  img.style.width = `${emote.sizePx}px`;
  img.style.height = `${emote.sizePx}px`;
  img.style.left = `${x}px`;
  img.style.top = `${y}px`;
  document.body.append(img);
  onScreen.push(img);

  const total = Math.max(emote.durationMs, POP_MS + FADE_MS);
  const animation = img.animate(
    [
      { transform: 'scale(0)', opacity: 0, offset: 0 },
      { transform: 'scale(1)', opacity: 1, offset: POP_MS / total },
      { transform: 'scale(1)', opacity: 1, offset: 1 - FADE_MS / total },
      { transform: 'scale(1)', opacity: 0, offset: 1 },
    ],
    { duration: total, easing: 'ease-out', fill: 'forwards' },
  );
  animation.addEventListener('finish', () => remove(img), { once: true });
}

window.overlay.onShow((emote) => void show(emote));
