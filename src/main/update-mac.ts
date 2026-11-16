// macOS: replace the running Chatbox.app with a downloaded one. Only Node
// APIs, so it can be tested without Electron.
//
// The built-in updater (Squirrel.Mac) refuses unsigned apps, so Chatbox
// swaps its own bundle. That works because files Chatbox downloads itself
// carry no "from the internet" mark, so macOS doesn't ask for approval
// again. It needs a writable folder (normally /Applications); if anything
// here fails, the caller falls back to the download link.
import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

const BUNDLE_ID = 'com.mineraphi.chatbox';
const OLD_PREFIX = '.Chatbox-old-';
const STAGING_PREFIX = '.Chatbox-update-';

/** The .app bundle that a binary inside it belongs to. */
export function bundleOf(execPath: string): string | null {
  return /^(.+\.app)\/Contents\/MacOS\/[^/]+$/.exec(execPath)?.[1] ?? null;
}

/** Why the bundle can't be replaced where it is, or null if it can. */
export async function whyNotSwappable(bundle: string): Promise<string | null> {
  // An app started straight from Downloads runs from a read-only copy.
  if (bundle.includes('/AppTranslocation/')) {
    return 'Move Chatbox to the Applications folder first, then start it from there.';
  }
  try {
    await fs.access(path.dirname(bundle), constants.W_OK);
    await fs.access(bundle, constants.W_OK);
  } catch {
    return `Chatbox isn't allowed to change ${path.dirname(bundle)}.`;
  }
  return null;
}

/**
 * Unpack `zip` and put its Chatbox.app where `bundle` is. The old bundle is
 * kept next to it under a hidden name (the running app still uses its
 * files) and removed by `cleanUpOldBundles` on the next start.
 */
export async function swapApp(zip: string, bundle: string): Promise<void> {
  const parent = path.dirname(bundle);
  const staging = path.join(parent, `${STAGING_PREFIX}${process.pid}`);
  const old = path.join(parent, `${OLD_PREFIX}${process.pid}.app`);
  const fresh = path.join(staging, 'Chatbox.app');

  await fs.rm(staging, { recursive: true, force: true });
  try {
    // ditto unpacks the way Finder does, keeping symlinks and attributes.
    await run('ditto', ['-x', '-k', zip, staging]);

    // Only ever install something that is a complete, intact Chatbox.
    await run('codesign', ['--verify', '--deep', '--strict', fresh]);
    const { stdout } = await run('/usr/libexec/PlistBuddy', [
      '-c',
      'Print :CFBundleIdentifier',
      path.join(fresh, 'Contents', 'Info.plist'),
    ]);
    if (stdout.trim() !== BUNDLE_ID) {
      throw new Error("the download isn't Chatbox");
    }

    await fs.rename(bundle, old);
    try {
      await fs.rename(fresh, bundle);
    } catch (err) {
      await fs.rename(old, bundle); // put the working app back
      throw err;
    }
  } finally {
    await fs.rm(staging, { recursive: true, force: true });
  }
}

/** Remove what earlier updates left next to the bundle. */
export async function cleanUpOldBundles(bundle: string): Promise<void> {
  const parent = path.dirname(bundle);
  const names = await fs.readdir(parent).catch(() => []);
  for (const name of names) {
    if (name.startsWith(OLD_PREFIX) || name.startsWith(STAGING_PREFIX)) {
      await fs
        .rm(path.join(parent, name), { recursive: true, force: true })
        .catch(() => {});
    }
  }
}
