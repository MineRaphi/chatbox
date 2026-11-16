import { EventEmitter } from 'node:events';
import { BrowserWindow, Notification, app, net, shell } from 'electron';
import {
  IpcChannel,
  type AvailableUpdate,
  type UpdateStatus,
} from '../shared/ipc';
import { showPicker } from './picker';
import { getSetting, onSettingChange, setSetting } from './store';
import {
  UNATTENDED,
  canInstall,
  currentInstall,
  installKind,
  isSafeUrl,
  pickUpdate,
} from './update-check';
import {
  cleanUpAfterUpdate,
  install,
  restartIntoUpdate,
} from './update-install';

// Check for new releases on GitHub and offer them. Where Chatbox can
// update itself (see InstallKind), an Install button does it; elsewhere
// the user gets a link to the right file. Nothing is installed unasked,
// unless the user switched on the auto-update setting, which exists only
// for the kinds of install that can update unattended.

const RELEASES_API =
  'https://api.github.com/repos/MineRaphi/chatbox/releases?per_page=30';

const FIRST_CHECK_DELAY_MS = 10_000;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1_000;
const FETCH_TIMEOUT_MS = 15_000;

// Dev runs are not installed anywhere, so they never update themselves.
const kind = app.isPackaged ? installKind(currentInstall()) : 'other';

let status: UpdateStatus = {
  state: 'idle',
  current: app.getVersion(),
  latest: null,
  checkedAt: null,
  error: null,
  installKind: kind,
  canInstall: false,
  canAutoUpdate: UNATTENDED.includes(kind),
  progress: null,
  installError: null,
};
const events = new EventEmitter<{ status: [UpdateStatus] }>();
let checking: Promise<void> | null = null;
let installing: Promise<void> | null = null;

function setStatus(next: Partial<UpdateStatus>): void {
  status = { ...status, ...next };
  events.emit('status', status);
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IpcChannel.UpdateStatusChanged, status);
  }
}

// --- Checking -------------------------------------------------------------

/** Dev only: point the check at a local feed to test the flow. */
function feedUrl(): string {
  const override = process.env.CHATBOX_UPDATE_URL;
  return !app.isPackaged && override ? override : RELEASES_API;
}

function notify(title: string, body: string, onClick: () => void): void {
  if (!Notification.isSupported()) return;
  const notification = new Notification({ title, body });
  notification.on('click', onClick);
  notification.show();
}

function notifyOnce(update: AvailableUpdate): void {
  if (getSetting('notifiedUpdateVersion') === update.version) return;
  setSetting('notifiedUpdateVersion', update.version);
  const title = `Chatbox ${update.version} is available`;
  if (status.canInstall) {
    notify(title, 'Click to open the settings and install it.', () =>
      showPicker('settings'),
    );
  } else {
    notify(
      title,
      update.fileName
        ? `Click to download ${update.fileName}.`
        : 'Click to open the download page.',
      () => openUpdate('download'),
    );
  }
}

/** The auto-update setting is on and applies to this update. */
const shouldAutoInstall = (): boolean =>
  status.state === 'available' &&
  status.canInstall &&
  status.canAutoUpdate &&
  getSetting('autoUpdate');

export function checkForUpdates(): Promise<void> {
  // An update that is being installed, or waits for a restart, stays as
  // it is; the next check after the restart looks again.
  if (status.state === 'installing' || status.state === 'ready') {
    return Promise.resolve();
  }
  checking ??= (async () => {
    setStatus({ state: 'checking', error: null });
    try {
      const res = await net.fetch(feedUrl(), {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': `Chatbox/${status.current}`,
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
      const latest = pickUpdate(
        await res.json(),
        status.current,
        // Scoop only carries full releases, so offer nothing else there.
        kind !== 'scoop' && getSetting('includeBetaUpdates'),
      );
      setStatus({
        state: latest ? 'available' : 'up-to-date',
        latest,
        checkedAt: Date.now(),
        canInstall: latest !== null && canInstall(kind, latest),
        installError: null,
      });
      if (shouldAutoInstall()) {
        void runInstall(false);
      } else if (latest) {
        notifyOnce(latest);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Network failures (offline, DNS, timeouts) in plain words.
      const offline = /^net::|timeout|aborted|fetch failed/i.test(message);
      setStatus({
        state: 'error',
        error: offline ? "can't reach GitHub. Are you online?" : message,
        checkedAt: Date.now(),
      });
    }
  })().finally(() => {
    checking = null;
  });
  return checking;
}

// --- Installing -------------------------------------------------------------

/**
 * Download and install the available update. With `restart`, Chatbox then
 * restarts into it; without (auto-update), it keeps running and the new
 * version starts next time.
 */
function runInstall(restart: boolean): Promise<void> {
  const update = status.latest;
  if (status.state !== 'available' || !status.canInstall || !update) {
    return installing ?? Promise.resolve();
  }
  installing ??= (async () => {
    setStatus({ state: 'installing', progress: null, installError: null });
    try {
      await install(kind, update, (progress) => {
        if (status.state === 'installing') setStatus({ progress });
      });
      // Only where the running copy is untouched can it keep running;
      // everywhere else its files were just replaced.
      if (restart || !UNATTENDED.includes(kind)) {
        restartIntoUpdate(kind);
        return;
      }
      setStatus({ state: 'ready', progress: null });
      notify(
        `Chatbox ${update.version} is installed`,
        'It starts the next time you open Chatbox. Click to restart now.',
        () => restartIntoUpdate(kind),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[updates] install failed:', err);
      setStatus({
        state: 'available',
        progress: null,
        installError: message,
      });
      // Asked for by the user: show where it says what went wrong.
      if (restart) showPicker('settings');
    }
  })().finally(() => {
    installing = null;
  });
  return installing;
}

/**
 * The Install button: install the update and restart, or, if it is
 * already installed, restart into it.
 */
export function installUpdate(): Promise<void> {
  if (status.state === 'ready') {
    restartIntoUpdate(kind);
    return Promise.resolve();
  }
  return runInstall(true);
}

export function openUpdate(what: 'download' | 'notes'): void {
  const update = status.latest;
  if (!update) return;
  const url = what === 'download' ? update.downloadUrl : update.pageUrl;
  if (isSafeUrl(url)) void shell.openExternal(url);
}

export function getUpdateStatus(): UpdateStatus {
  return status;
}

export function onUpdateStatus(listener: (s: UpdateStatus) => void): void {
  events.on('status', listener);
}

export function initUpdates(): void {
  cleanUpAfterUpdate(kind);
  onSettingChange((key) => {
    if (key === 'includeBetaUpdates') void checkForUpdates();
    // Switched on while an update is already waiting: install it now.
    if (key === 'autoUpdate' && shouldAutoInstall()) void runInstall(false);
  });
  // Automatic checks in installed builds (or when a test feed is set);
  // dev runs can still check by hand.
  if (!app.isPackaged && !process.env.CHATBOX_UPDATE_URL) return;
  setTimeout(() => void checkForUpdates(), FIRST_CHECK_DELAY_MS);
  setInterval(() => void checkForUpdates(), CHECK_INTERVAL_MS);
}
