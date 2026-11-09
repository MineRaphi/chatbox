import path from 'node:path';
import { BrowserWindow, screen, type Display } from 'electron';
import { IpcChannel, type OverlayEmote } from '../shared/ipc';
import { getSettings } from './store';

// 7TV emote IDs are ULIDs: 26 uppercase base32 characters.
const EMOTE_ID = /^[0-9A-Z]{26}$/;

// Receive cap: at most this many remote emotes per window of time.
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 10_000;

interface OverlayWindow {
  win: BrowserWindow;
  ready: boolean;
}

const overlays = new Map<number, OverlayWindow>();
const recentRemote: number[] = [];

function createOverlay(display: Display): OverlayWindow {
  const { x, y, width, height } = display.workArea;
  const win = new BrowserWindow({
    x,
    y,
    width,
    height,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    focusable: false,
    skipTaskbar: true,
    // An NSPanel can float above other apps' fullscreen spaces on macOS.
    ...(process.platform === 'darwin' ? { type: 'panel' } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'overlay.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  win.setIgnoreMouseEvents(true);
  win.setAlwaysOnTop(true, 'screen-saver');
  if (process.platform === 'darwin') {
    // We are already a UI-element app (no dock icon), so skip the process
    // type transform that would briefly flash the dock.
    win.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true,
    });
  }

  const overlay: OverlayWindow = { win, ready: false };
  win.webContents.once('did-finish-load', () => {
    overlay.ready = true;
    win.showInactive();
  });

  if (OVERLAY_VITE_DEV_SERVER_URL) {
    void win.loadURL(OVERLAY_VITE_DEV_SERVER_URL);
  } else {
    void win.loadFile(
      path.join(__dirname, `../renderer/${OVERLAY_VITE_NAME}/index.html`),
    );
  }

  return overlay;
}

function destroyOverlay(displayId: number): void {
  overlays.get(displayId)?.win.destroy();
  overlays.delete(displayId);
}

/** Make sure there is exactly one overlay per display, sized to its work area. */
function syncDisplays(): void {
  const displays = screen.getAllDisplays();
  const ids = new Set(displays.map((d) => d.id));

  // Deleting from a Map while iterating it is safe in JS.
  for (const id of overlays.keys()) {
    if (!ids.has(id)) destroyOverlay(id);
  }
  for (const display of displays) {
    const existing = overlays.get(display.id);
    if (existing) {
      existing.win.setBounds(display.workArea);
    } else {
      overlays.set(display.id, createOverlay(display));
    }
  }
}

function targetDisplays(): Display[] {
  switch (getSettings().overlayMonitor) {
    case 'all':
      return screen.getAllDisplays();
    case 'cursor':
      return [screen.getDisplayNearestPoint(screen.getCursorScreenPoint())];
    case 'primary':
      return [screen.getPrimaryDisplay()];
  }
}

function withinRateLimit(now: number): boolean {
  while (recentRemote.length && now - recentRemote[0]! > RATE_WINDOW_MS) {
    recentRemote.shift();
  }
  if (recentRemote.length >= RATE_LIMIT) return false;
  recentRemote.push(now);
  return true;
}

export function initOverlays(): void {
  syncDisplays();
  screen.on('display-added', syncDisplays);
  screen.on('display-removed', syncDisplays);
  screen.on('display-metrics-changed', syncDisplays);
}

/**
 * Show an emote on the target displays.
 * `remote` emotes come from other people: they are dropped during Do not
 * disturb and count toward the rate limit. Local previews of your own sends
 * always show.
 */
export function isEmoteId(value: unknown): value is string {
  return typeof value === 'string' && EMOTE_ID.test(value);
}

export function showEmote(
  emoteId: unknown,
  remote: boolean,
  from: string | null = null,
): boolean {
  if (!isEmoteId(emoteId)) return false;
  const settings = getSettings();
  if (remote && settings.doNotDisturb) return false;
  if (remote && settings.limitRate && !withinRateLimit(Date.now())) {
    return false;
  }

  const emote: OverlayEmote = {
    url: `https://cdn.7tv.app/emote/${emoteId}/4x.webp`,
    sizePx: settings.overlaySizePx,
    durationMs: settings.overlayDurationMs,
    limitOnScreen: settings.limitOnScreen,
    // Only others' emotes get a name; yours are your own preview.
    from: remote && settings.showSenderName && from ? from : null,
  };

  for (const display of targetDisplays()) {
    const overlay = overlays.get(display.id);
    if (overlay?.ready) {
      overlay.win.webContents.send(IpcChannel.OverlayShow, emote);
    }
  }
  return true;
}
