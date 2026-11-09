import { EventEmitter } from 'node:events';
import { BrowserWindow, Notification, app, net, shell } from 'electron';
import {
  IpcChannel,
  type AvailableUpdate,
  type UpdateStatus,
} from '../shared/ipc';
import { isSafeUrl, pickUpdate } from './update-check';
import { getSetting, onSettingChange, setSetting } from './store';

// Check for new releases on GitHub and suggest installing them. Nothing is
// downloaded or installed automatically: the user gets a notification and
// a link to the right file for their system.

const RELEASES_API =
  'https://api.github.com/repos/MineRaphi/chatbox/releases?per_page=30';

const FIRST_CHECK_DELAY_MS = 10_000;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1_000;
const FETCH_TIMEOUT_MS = 15_000;

let status: UpdateStatus = {
  state: 'idle',
  current: app.getVersion(),
  latest: null,
  checkedAt: null,
  error: null,
};
const events = new EventEmitter<{ status: [UpdateStatus] }>();
let checking: Promise<void> | null = null;

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

function notifyOnce(update: AvailableUpdate): void {
  if (getSetting('notifiedUpdateVersion') === update.version) return;
  setSetting('notifiedUpdateVersion', update.version);
  if (!Notification.isSupported()) return;
  const notification = new Notification({
    title: `Chatbox ${update.version} is available`,
    body: update.fileName
      ? `Click to download ${update.fileName}.`
      : 'Click to open the download page.',
  });
  notification.on('click', () => openUpdate('download'));
  notification.show();
}

export function checkForUpdates(): Promise<void> {
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
        getSetting('includeBetaUpdates'),
      );
      setStatus({
        state: latest ? 'available' : 'up-to-date',
        latest,
        checkedAt: Date.now(),
      });
      if (latest) notifyOnce(latest);
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
  onSettingChange((key) => {
    if (key === 'includeBetaUpdates') void checkForUpdates();
  });
  // Automatic checks in installed builds (or when a test feed is set);
  // dev runs can still check by hand.
  if (!app.isPackaged && !process.env.CHATBOX_UPDATE_URL) return;
  setTimeout(() => void checkForUpdates(), FIRST_CHECK_DELAY_MS);
  setInterval(() => void checkForUpdates(), CHECK_INTERVAL_MS);
}
