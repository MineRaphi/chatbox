import path from 'node:path';
import { BrowserWindow, app, screen } from 'electron';

const WIDTH = 360;
const HEIGHT = 420;
const RELOAD_DELAY_MS = 1_000;

let picker: BrowserWindow | null = null;
let loaded = false;
let showWhenLoaded = false;

function load(win: BrowserWindow): void {
  loaded = false;
  if (PICKER_VITE_DEV_SERVER_URL) {
    void win.loadURL(PICKER_VITE_DEV_SERVER_URL);
  } else {
    void win.loadFile(
      path.join(__dirname, `../renderer/${PICKER_VITE_NAME}/index.html`),
    );
  }
}

function reloadSoon(win: BrowserWindow, reason: string): void {
  console.warn(`[picker] ${reason}; reloading`);
  loaded = false;
  setTimeout(() => {
    if (!win.isDestroyed()) load(win);
  }, RELOAD_DELAY_MS);
}

function createPicker(): BrowserWindow {
  const win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#18181b',
    webPreferences: {
      preload: path.join(__dirname, 'picker.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  // The picker is a popup: it goes away when it loses focus or on Esc.
  win.on('blur', () => win.hide());
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') {
      event.preventDefault();
      win.hide();
    }
  });
  win.on('closed', () => {
    picker = null;
  });

  // Only show the window once its page has rendered, never as a blank frame.
  win.webContents.on('did-finish-load', () => {
    loaded = true;
    if (showWhenLoaded) {
      showWhenLoaded = false;
      present(win);
    }
  });

  // A page that failed to load or crashed would otherwise stay blank forever.
  win.webContents.on(
    'did-fail-load',
    (_e, code, description, url, isMainFrame) => {
      // -3 (ERR_ABORTED) just means a newer navigation replaced this one,
      // e.g. Vite reloading the page in dev.
      if (isMainFrame && code !== -3)
        reloadSoon(win, `load failed (${code} ${description}) for ${url}`);
    },
  );
  win.webContents.on('render-process-gone', (_e, details) => {
    reloadSoon(win, `renderer gone (${details.reason})`);
  });

  // In dev, surface renderer errors in the terminal.
  if (!app.isPackaged) {
    win.webContents.on('console-message', ({ level, message }) => {
      if (level === 'error' || level === 'warning') {
        console.warn(`[picker:${level}] ${message}`);
      }
    });
  }

  load(win);
  return win;
}

function present(win: BrowserWindow): void {
  const { workArea } = screen.getDisplayNearestPoint(
    screen.getCursorScreenPoint(),
  );
  win.setPosition(
    Math.round(workArea.x + (workArea.width - WIDTH) / 2),
    Math.round(workArea.y + (workArea.height - HEIGHT) / 2),
  );

  // A menu-bar app isn't the active app; activate it so the picker gets
  // keyboard focus (and so the blur-to-hide behaviour works).
  if (process.platform === 'darwin') app.focus({ steal: true });
  win.show();
  win.focus();
}

/** Create the picker hidden at startup so it is loaded before first use. */
export function initPicker(): void {
  picker ??= createPicker();
}

/** Show the picker centered on the display the cursor is on. */
export function showPicker(): void {
  picker ??= createPicker();
  if (loaded) {
    present(picker);
  } else {
    showWhenLoaded = true;
  }
}
