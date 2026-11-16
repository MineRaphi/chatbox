// Linux AppImage: give the file a permanent home. No Electron imports, so
// it can be tested with plain Node.
//
// An AppImage runs from wherever it was downloaded to, often ~/Downloads,
// under a name with the version in it. Chatbox moves itself once to
// ~/Applications/Chatbox.AppImage, so the app menu entry, launch at login,
// window manager keybinds and updates all have one path that never
// changes, and adds a `chatbox` command in ~/.local/bin.
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

const LAUNCHER_MARK = '# Chatbox launcher, written by Chatbox.';

/** What Chatbox remembers about the copy in ~/Applications. */
interface HomeRecord {
  /** Version of the AppImage at the home path. */
  version?: string;
  /** Where it was moved from, until the user has been told. */
  movedFrom?: string;
}

export interface HomeOptions {
  /** The running AppImage file ($APPIMAGE). */
  appImage: string;
  /** The user's home folder. */
  homeDir: string;
  /** Version of the running AppImage. */
  version: string;
  /** JSON file in the settings folder that holds the HomeRecord. */
  recordFile: string;
  /** True if version `a` is newer than version `b`. */
  isNewer: (a: string, b: string) => boolean;
  /** Command line that starts the AppImage at the given path. */
  launcherExec: (appImage: string) => string;
}

export const homePath = (homeDir: string): string =>
  path.join(homeDir, 'Applications', 'Chatbox.AppImage');

function readRecord(file: string): HomeRecord {
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeRecord(file: string, record: HomeRecord): void {
  try {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(record));
  } catch {
    // Not being able to remember only means asking the file system again.
  }
}

/** Move `from` to `to`, replacing it in one step; copy across disks. */
function move(from: string, to: string): void {
  mkdirSync(path.dirname(to), { recursive: true });
  try {
    renameSync(from, to);
  } catch {
    // Another disk, or a folder we may read but not change.
    const tmp = `${to}.tmp`;
    try {
      copyFileSync(from, tmp);
      renameSync(tmp, to);
    } catch (err) {
      rmSync(tmp, { force: true });
      throw err;
    }
    rmSync(from, { force: true });
  }
  chmodSync(to, 0o755);
}

/**
 * `~/.local/bin/chatbox`, a small script that starts the AppImage. Only
 * written if there is nothing there, or an older launcher of ours.
 */
function ensureLauncher(homeDir: string, exec: string): void {
  const file = path.join(homeDir, '.local', 'bin', 'chatbox');
  const content = `#!/bin/sh\n${LAUNCHER_MARK} Safe to delete.\nexec ${exec} "$@"\n`;
  try {
    const stat = lstatSync(file, { throwIfNoEntry: false });
    if (stat) {
      // Someone else's file or link: leave it alone.
      if (!stat.isFile()) return;
      const existing = readFileSync(file, 'utf8');
      if (!existing.includes(LAUNCHER_MARK) || existing === content) return;
    }
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
    chmodSync(file, 0o755);
  } catch {
    // The command is a convenience; Chatbox works without it.
  }
}

/**
 * Make sure Chatbox runs from its home path if it can. Returns the path
 * the AppImage is at afterwards (the home path, or where it already was).
 *
 * It stays where it is when the home path holds a copy that isn't older
 * than this one (starting an old download must never downgrade), when that
 * copy's version is unknown, or when the folder can't be written to.
 */
export function settleAppImage(options: HomeOptions): string {
  const { appImage, homeDir, version, recordFile } = options;
  const target = homePath(homeDir);
  let current: string;
  try {
    current = realpathSync(appImage);
  } catch {
    return appImage;
  }
  const record = readRecord(recordFile);

  if (existsSync(target)) {
    if (realpathSync(target) === current) {
      // Already home (also after an update): remember what version is here.
      if (record.version !== version)
        writeRecord(recordFile, { ...record, version });
      ensureLauncher(homeDir, options.launcherExec(target));
      return target;
    }
    if (!record.version || !options.isNewer(version, record.version)) {
      return appImage;
    }
  }

  try {
    move(current, target);
  } catch {
    return appImage;
  }
  writeRecord(recordFile, { version, movedFrom: current });
  ensureLauncher(homeDir, options.launcherExec(target));
  return target;
}

/**
 * Where the AppImage was moved from, if the user hasn't been told yet.
 * Returns it once; afterwards null.
 */
export function takeMoveNotice(recordFile: string): string | null {
  const record = readRecord(recordFile);
  if (!record.movedFrom) return null;
  writeRecord(recordFile, { version: record.version });
  return record.movedFrom;
}
