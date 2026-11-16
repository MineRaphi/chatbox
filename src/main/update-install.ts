import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { promisify } from 'node:util';
import { app, autoUpdater, net } from 'electron';
import type { AvailableUpdate, InstallKind } from '../shared/ipc';
import { restartApp } from './session';
import {
  isSafeUrl,
  packageInstallCommand,
  releaseFilesUrl,
  scoopUpdateScript,
} from './update-check';
import {
  bundleOf,
  cleanUpOldBundles,
  swapApp,
  whyNotSwappable,
} from './update-mac';

// Installing an update, once per kind of install (see InstallKind). Each
// installer leaves the new version in place so that it runs from the next
// start; restartIntoUpdate() then starts it.
//
// Builds are unsigned, so what vouches for an update is that it comes from
// this repo's releases over HTTPS and matches the SHA-256 GitHub reports
// for it. Nothing is installed without that check (Windows' own updater
// and Scoop verify their downloads themselves).

const run = promisify(execFile);

const DOWNLOAD_TIMEOUT_MS = 15 * 60 * 1_000;
const SCOOP_MANIFEST =
  'https://raw.githubusercontent.com/MineRaphi/chatbox/main/bucket/chatbox.json';

type Progress = (fraction: number | null) => void;

/** Where downloads go before they're installed. */
async function downloadsDir(): Promise<string> {
  const dir = path.join(app.getPath('userData'), 'updates');
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/** Download the update's file to `dest` and check it against its SHA-256. */
async function download(
  update: AvailableUpdate,
  dest: string,
  onProgress: Progress,
): Promise<void> {
  if (!isSafeUrl(update.downloadUrl) || !update.sha256) {
    throw new Error('this release has no verifiable download');
  }
  const res = await net.fetch(update.downloadUrl, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  });
  if (!res.ok || !res.body) {
    throw new Error(`the download failed (GitHub answered ${res.status})`);
  }

  const total = Number(res.headers.get('content-length')) || 0;
  const hash = createHash('sha256');
  const file = await fs.open(dest, 'w');
  let done = 0;
  let lastPercent = -1;
  try {
    const body = Readable.fromWeb(
      res.body as Parameters<typeof Readable.fromWeb>[0],
    );
    for await (const chunk of body as AsyncIterable<Buffer>) {
      hash.update(chunk);
      await file.write(chunk);
      done += chunk.length;
      const percent = total ? Math.floor((done / total) * 100) : -1;
      if (percent !== lastPercent) {
        lastPercent = percent;
        onProgress(total ? Math.min(1, done / total) : null);
      }
    }
  } finally {
    await file.close();
  }

  if (hash.digest('hex') !== update.sha256) {
    await fs.rm(dest, { force: true });
    throw new Error("the download didn't match its checksum");
  }
}

// --- Linux: AppImage ---------------------------------------------------------

/** Replace the AppImage file itself; the running copy keeps the old one. */
async function installAppImage(
  update: AvailableUpdate,
  onProgress: Progress,
): Promise<void> {
  const target = process.env.APPIMAGE;
  if (!target) throw new Error('not running from an AppImage');
  try {
    await fs.access(path.dirname(target), constants.W_OK);
    await fs.access(target, constants.W_OK);
  } catch {
    throw new Error(`Chatbox isn't allowed to change ${target}`);
  }

  // Next to the old file, so the final rename stays on one disk and
  // replaces it in a single step.
  const fresh = `${target}.update`;
  try {
    await download(update, fresh, onProgress);
    await fs.chmod(fresh, 0o755);
    await fs.rename(fresh, target);
  } catch (err) {
    await fs.rm(fresh, { force: true });
    throw err;
  }
}

// --- Linux: .deb and .rpm ----------------------------------------------------

/** Download the package and install it with the system's password prompt. */
async function installPackage(
  kind: 'deb' | 'rpm',
  update: AvailableUpdate,
  onProgress: Progress,
): Promise<void> {
  const dir = await downloadsDir();
  const file = path.join(
    dir,
    path.basename(update.fileName ?? `update.${kind}`),
  );
  try {
    await download(update, file, onProgress);
    onProgress(null);
    await run('pkexec', packageInstallCommand(kind, file));
  } catch (err) {
    const code = (err as { code?: unknown }).code;
    if (code === 'ENOENT') {
      throw new Error(
        'your system has no pkexec to ask for the password; install the download by hand',
        { cause: err },
      );
    }
    // pkexec: 126 = not authorized or dismissed, 127 = no way to ask.
    if (code === 126) {
      throw new Error('the password prompt was cancelled', { cause: err });
    }
    if (code === 127) {
      throw new Error(
        "your desktop can't show a password prompt; install the download by hand",
        { cause: err },
      );
    }
    throw err;
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

// --- macOS -------------------------------------------------------------------

async function installMac(
  update: AvailableUpdate,
  onProgress: Progress,
): Promise<void> {
  const bundle = bundleOf(process.execPath);
  if (!bundle) throw new Error('Chatbox is not running from an app bundle');
  const blocked = await whyNotSwappable(bundle);
  if (blocked) throw new Error(blocked);

  const dir = await downloadsDir();
  try {
    const zip = path.join(dir, 'Chatbox.zip');
    await download(update, zip, onProgress);
    onProgress(null);
    await swapApp(zip, bundle).catch((err: unknown) => {
      // Tool failures (ditto, codesign) carry a long command line.
      throw new Error(
        (err as { cmd?: unknown }).cmd
          ? "the downloaded app couldn't be unpacked or verified"
          : err instanceof Error
            ? err.message
            : String(err),
        { cause: err },
      );
    });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

// --- Windows: installer (Squirrel) ------------------------------------------

/** Let the installer's own updater fetch and unpack the new version. */
async function installSquirrel(update: AvailableUpdate): Promise<void> {
  autoUpdater.setFeedURL({ url: releaseFilesUrl(update.version) });
  try {
    await new Promise<void>((resolve, reject) => {
      autoUpdater.once('update-downloaded', () => resolve());
      autoUpdater.once('update-not-available', () =>
        reject(new Error('the Windows updater found no newer version')),
      );
      autoUpdater.once('error', reject);
      autoUpdater.checkForUpdates();
    });
  } finally {
    autoUpdater.removeAllListeners('update-downloaded');
    autoUpdater.removeAllListeners('update-not-available');
    autoUpdater.removeAllListeners('error');
  }
}

// --- Windows: Scoop ----------------------------------------------------------

/** Hand over to Scoop. The caller quits Chatbox right after this. */
async function installScoop(update: AvailableUpdate): Promise<void> {
  // The manifest is updated by a workflow shortly after a release is
  // published; until then Scoop would report "already up to date".
  const res = await net.fetch(SCOOP_MANIFEST, {
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  });
  const manifest = res.ok ? ((await res.json()) as { version?: unknown }) : {};
  if (manifest.version !== update.version) {
    throw new Error(
      `Scoop doesn't have ${update.version} yet. Try again in a few minutes.`,
    );
  }

  const script = path.join(app.getPath('temp'), 'chatbox-scoop-update.ps1');
  await fs.writeFile(script, scoopUpdateScript(process.pid, process.execPath));
  const child = spawn(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script],
    { detached: true, stdio: 'ignore', windowsHide: false },
  );
  await new Promise<void>((resolve, reject) => {
    child.once('spawn', () => resolve());
    child.once('error', reject);
  });
  child.unref();
}

// --- Entry points ------------------------------------------------------------

/**
 * Install `update` for this kind of install. When it resolves, the new
 * version is in place (for Scoop: the hand-over script is running and
 * Chatbox has to quit).
 */
export async function install(
  kind: InstallKind,
  update: AvailableUpdate,
  onProgress: Progress,
): Promise<void> {
  switch (kind) {
    case 'squirrel':
      return installSquirrel(update);
    case 'scoop':
      return installScoop(update);
    case 'appimage':
      return installAppImage(update, onProgress);
    case 'deb':
    case 'rpm':
      return installPackage(kind, update, onProgress);
    case 'mac':
      return installMac(update, onProgress);
    default:
      throw new Error("this build can't install updates by itself");
  }
}

/** Start the version that `install` put in place. */
export function restartIntoUpdate(kind: InstallKind): void {
  if (kind === 'squirrel') {
    autoUpdater.quitAndInstall();
  } else if (kind === 'scoop') {
    app.quit(); // the script starts Chatbox again
  } else {
    restartApp();
  }
}

/** At startup: remove what an earlier update left behind. */
export function cleanUpAfterUpdate(kind: InstallKind): void {
  void fs
    .rm(path.join(app.getPath('userData'), 'updates'), {
      recursive: true,
      force: true,
    })
    .catch(() => {});
  if (kind === 'mac') {
    const bundle = bundleOf(process.execPath);
    if (bundle) void cleanUpOldBundles(bundle);
  }
}
