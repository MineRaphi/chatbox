// Pure update logic, no Electron: which release is newer and which file
// fits this system. Kept separate so it can be tested with plain Node.
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { AvailableUpdate, InstallKind } from '../shared/ipc';

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
/** What decides which download fits this copy of Chatbox. */
export interface InstallInfo {
  platform: NodeJS.Platform;
  arch: string;
  /** Windows: installed with the Setup.exe (Squirrel), not the zip. */
  squirrel: boolean;
  /** Windows: installed with Scoop. */
  scoop: boolean;
  /** Linux: running from an AppImage. */
  appImage: boolean;
  /** Linux: a Debian-based system (.deb rather than .rpm). */
  debian: boolean;
}

/**
 * The release file that fits `info`, as a pattern on file names. The names
 * are given by scripts/collect-release-files.mjs.
 */
export function assetPatternFor(info: InstallInfo): RegExp | null {
  switch (info.platform) {
    case 'darwin':
      return info.arch === 'arm64'
        ? /^Chatbox-.+-macOS-AppleSilicon\.zip$/
        : /^Chatbox-.+-macOS-Intel\.zip$/;
    case 'win32':
      return info.squirrel
        ? /^Chatbox-.+-Windows-Setup\.exe$/
        : /^Chatbox-.+-Windows-Portable\.zip$/;
    case 'linux':
      if (info.appImage) return /^Chatbox-.+-Linux\.AppImage$/;
      if (info.debian) return /^Chatbox-.+-Linux\.deb$/;
      return /^Chatbox-.+-Linux\.rpm$/;
    default:
      return null;
  }
}

/** The kind of install, which decides how Chatbox can update itself. */
export function installKind(info: InstallInfo): InstallKind {
  switch (info.platform) {
    case 'darwin':
      return 'mac';
    case 'win32':
      if (info.squirrel) return 'squirrel';
      return info.scoop ? 'scoop' : 'win-portable';
    case 'linux':
      // Only x64 builds exist; anything else was built by hand.
      if (info.arch !== 'x64') return 'other';
      if (info.appImage) return 'appimage';
      return info.debian ? 'deb' : 'rpm';
    default:
      return 'other';
  }
}

/** Kinds that can install an update when asked to (the Install button). */
export const SELF_INSTALLING: readonly InstallKind[] = [
  'squirrel',
  'scoop',
  'appimage',
  'deb',
  'rpm',
  'mac',
];
/** Kinds that can also do it unattended (the auto-update toggle). */
export const UNATTENDED: readonly InstallKind[] = ['squirrel', 'appimage'];

/**
 * Whether Chatbox can install this update itself. Besides the kind of
 * install, the release has to carry what that needs: a checksum to verify
 * the download against, or the Windows updater's own files.
 */
export function canInstall(
  kind: InstallKind,
  update: AvailableUpdate,
): boolean {
  if (!SELF_INSTALLING.includes(kind)) return false;
  if (kind === 'squirrel') return update.squirrelFeed;
  // Scoop downloads and verifies by itself, from its own manifest.
  if (kind === 'scoop') return true;
  return update.fileName !== null && update.sha256 !== null;
}

/** Folder of a release's files, e.g. for the Windows updater's feed. */
export function releaseFilesUrl(version: string): string {
  return `${SAFE_URL_PREFIX}download/v${version}`;
}

// --- Install commands -----------------------------------------------------

/** The command that installs a downloaded package, run through pkexec. */
export function packageInstallCommand(
  kind: 'deb' | 'rpm',
  file: string,
): string[] {
  return kind === 'deb'
    ? ['dpkg', '-i', file]
    : // 2.1.0 counts as older than 2.1.0.beta for rpm; allow that step.
      ['rpm', '-U', '--oldpackage', file];
}

/**
 * The script that updates Chatbox with Scoop after this copy has quit
 * (Scoop refuses to touch a running program), then starts it again. Its
 * window stays visible so progress and errors can be seen.
 */
export function scoopUpdateScript(pid: number, execPath: string): string {
  // …\scoop\apps\chatbox\<version>\Chatbox.exe → …\current\Chatbox.exe
  const exe = execPath.replace(
    /([\\/]scoop[\\/]apps[\\/]chatbox[\\/])[^\\/]+/i,
    '$1current',
  );
  const quoted = `'${exe.replaceAll("'", "''")}'`;
  return [
    "Write-Host 'Updating Chatbox with Scoop...'",
    `Wait-Process -Id ${pid} -Timeout 30 -ErrorAction SilentlyContinue`,
    'scoop update',
    'scoop update chatbox',
    '$failed = -not $?',
    `Start-Process -FilePath ${quoted}`,
    'if ($failed) {',
    "  Write-Host 'Scoop reported a problem (see above). Chatbox was started again.'",
    "  Read-Host 'Press Enter to close this window'",
    '} else {',
    "  Write-Host 'Done. This window closes by itself.'",
    '  Start-Sleep -Seconds 4',
    '}',
    '',
  ].join('\r\n');
}

/** How this running copy was installed. */
export function currentInstall(): InstallInfo {
  return {
    platform: process.platform,
    arch: process.arch,
    // Squirrel puts Update.exe next to the app's version folder.
    squirrel:
      process.platform === 'win32' &&
      existsSync(
        path.resolve(path.dirname(process.execPath), '..', 'Update.exe'),
      ),
    // Scoop keeps apps in <scoop>\\apps\\<name>\\<version or "current">.
    scoop:
      process.platform === 'win32' &&
      /[\\/]scoop[\\/]apps[\\/]chatbox[\\/]/i.test(process.execPath),
    appImage: Boolean(process.env.APPIMAGE),
    debian: existsSync('/etc/debian_version'),
  };
}

interface GitHubRelease {
  tag_name?: unknown;
  draft?: unknown;
  prerelease?: unknown;
  html_url?: unknown;
  assets?: {
    name?: unknown;
    browser_download_url?: unknown;
    digest?: unknown;
  }[];
}

export const isSafeUrl = (v: unknown): v is string =>
  typeof v === 'string' && v.startsWith(SAFE_URL_PREFIX);

/** The newest release above the running version, if there is one. */
export function pickUpdate(
  releases: unknown,
  current: string,
  includeBeta: boolean,
  install: InstallInfo = currentInstall(),
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

  const pattern = assetPatternFor(install);
  const asset = (best.release.assets ?? []).find(
    (a) =>
      typeof a.name === 'string' &&
      pattern?.test(a.name) &&
      isSafeUrl(a.browser_download_url),
  );
  const pageUrl = best.release.html_url as string;
  const digest = typeof asset?.digest === 'string' ? asset.digest : '';
  const names = new Set(
    (best.release.assets ?? []).map((a) =>
      typeof a.name === 'string' ? a.name : '',
    ),
  );
  return {
    version: (best.release.tag_name as string).replace(/^v/, ''),
    prerelease: best.release.prerelease === true,
    pageUrl,
    downloadUrl: asset ? (asset.browser_download_url as string) : pageUrl,
    fileName: asset ? (asset.name as string) : null,
    sha256: /^sha256:([0-9a-f]{64})$/.exec(digest)?.[1] ?? null,
    // Squirrel reads RELEASES, which names the .nupkg to download.
    squirrelFeed:
      names.has('RELEASES') && [...names].some((n) => n.endsWith('.nupkg')),
  };
}
