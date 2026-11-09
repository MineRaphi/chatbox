// Pure update logic, no Electron: which release is newer and which file
// fits this system. Kept separate so it can be tested with plain Node.
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { AvailableUpdate } from '../shared/ipc';

// Only ever open links into this repo's releases, whatever the API says.
export const SAFE_URL_PREFIX = 'https://github.com/MineRaphi/chatbox/releases/';

// --- Versions -------------------------------------------------------------

interface Version {
  nums: [number, number, number];
  pre: string[]; // `beta` → ['beta']; empty for a stable release
}

/** Parse `v2.0.1-beta` / `2.0.1` (semver core plus optional pre-release). */
export function parseVersion(raw: string): Version | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(raw.trim());
  if (!m) return null;
  return {
    nums: [Number(m[1]), Number(m[2]), Number(m[3])],
    pre: m[4] ? m[4].split('.') : [],
  };
}

/** Semver precedence: negative if a < b, 0 if equal, positive if a > b. */
export function compareVersions(a: Version, b: Version): number {
  for (let i = 0; i < 3; i++) {
    const d = a.nums[i]! - b.nums[i]!;
    if (d !== 0) return d;
  }
  // A release outranks its own pre-releases: 2.0.1 > 2.0.1-beta.
  if (!a.pre.length || !b.pre.length) return b.pre.length - a.pre.length;
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    const x = a.pre[i];
    const y = b.pre[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    if (xn && yn) {
      const d = Number(x) - Number(y);
      if (d !== 0) return d;
    } else if (xn !== yn) {
      return xn ? -1 : 1; // numeric identifiers sort first
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}

// --- Picking the right download ------------------------------------------

/** How this copy was installed decides which file fits. */
function assetPattern(): RegExp | null {
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  switch (process.platform) {
    case 'darwin':
      return new RegExp(`^Chatbox-darwin-${arch}-.+\\.zip$`);
    case 'win32': {
      // Installed with Chatbox-Setup.exe: Squirrel's Update.exe sits next
      // to the app folder. Otherwise it's the portable zip.
      const updateExe = path.resolve(
        path.dirname(process.execPath),
        '..',
        'Update.exe',
      );
      return existsSync(updateExe)
        ? /^Chatbox-Setup\.exe$/
        : /^Chatbox-win32-x64-.+\.zip$/;
    }
    case 'linux':
      if (process.env.APPIMAGE) return /^Chatbox-.+-x64\.AppImage$/;
      if (existsSync('/etc/debian_version')) return /^chatbox_.+_amd64\.deb$/;
      return /^chatbox-.+\.x86_64\.rpm$/;
    default:
      return null;
  }
}

interface GitHubRelease {
  tag_name?: unknown;
  draft?: unknown;
  prerelease?: unknown;
  html_url?: unknown;
  assets?: { name?: unknown; browser_download_url?: unknown }[];
}

export const isSafeUrl = (v: unknown): v is string =>
  typeof v === 'string' && v.startsWith(SAFE_URL_PREFIX);

/** The newest release above the running version, if there is one. */
export function pickUpdate(
  releases: unknown,
  current: string,
  includeBeta: boolean,
): AvailableUpdate | null {
  if (!Array.isArray(releases))
    throw new Error('unexpected answer from GitHub');
  const running = parseVersion(current);
  if (!running) return null;

  let best: { version: Version; release: GitHubRelease } | null = null;
  for (const entry of releases as unknown[]) {
    if (typeof entry !== 'object' || entry === null) continue;
    const release = entry as GitHubRelease;
    if (release.draft === true) continue;
    if (release.prerelease === true && !includeBeta) continue;
    if (typeof release.tag_name !== 'string' || !isSafeUrl(release.html_url)) {
      continue;
    }
    const version = parseVersion(release.tag_name);
    if (!version || compareVersions(version, running) <= 0) continue;
    if (!best || compareVersions(version, best.version) > 0) {
      best = { version, release };
    }
  }
  if (!best) return null;

  const pattern = assetPattern();
  const asset = (best.release.assets ?? []).find(
    (a) =>
      typeof a.name === 'string' &&
      pattern?.test(a.name) &&
      isSafeUrl(a.browser_download_url),
  );
  const pageUrl = best.release.html_url as string;
  return {
    version: (best.release.tag_name as string).replace(/^v/, ''),
    prerelease: best.release.prerelease === true,
    pageUrl,
    downloadUrl: asset ? (asset.browser_download_url as string) : pageUrl,
    fileName: asset ? (asset.name as string) : null,
  };
}
