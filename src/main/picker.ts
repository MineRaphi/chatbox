import path from 'node:path';
import { BrowserWindow, screen } from 'electron';

const WIDTH = 360;
const HEIGHT = 420;

let picker: BrowserWindow | null = null;

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

  if (PICKER_VITE_DEV_SERVER_URL) {
    void win.loadURL(PICKER_VITE_DEV_SERVER_URL);
  } else {
    void win.loadFile(
      path.join(__dirname, `../renderer/${PICKER_VITE_NAME}/index.html`),
    );
  }

  return win;
}

/** Show the picker centered on the display the cursor is on. */
export function showPicker(): void {
  picker ??= createPicker();

  const { workArea } = screen.getDisplayNearestPoint(
    screen.getCursorScreenPoint(),
  );
  picker.setPosition(
    Math.round(workArea.x + (workArea.width - WIDTH) / 2),
    Math.round(workArea.y + (workArea.height - HEIGHT) / 2),
  );

  picker.show();
  picker.focus();
}
