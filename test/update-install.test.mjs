// Which builds can install updates themselves, and what that needs.
import assert from 'node:assert/strict';
import { test } from 'node:test';
const m = await import('../src/main/update-check.ts');

const base = {
  platform: 'linux',
  arch: 'x64',
  squirrel: false,
  scoop: false,
  appImage: false,
  debian: false,
};
const HASH = 'a'.repeat(64);
// `digest: null` leaves the checksum out, as older GitHub answers do.
const releases = (files, digest = `sha256:${HASH}`) => [
  {
    tag_name: 'v9.0.0',
    prerelease: false,
    draft: false,
    html_url: `${m.SAFE_URL_PREFIX}tag/v9.0.0`,
    assets: files.map((name) => ({
      name,
      browser_download_url: `${m.SAFE_URL_PREFIX}download/v9.0.0/${name}`,
      ...(digest === null ? {} : { digest }),
    })),
  },
];
const kind = (over) => m.installKind({ ...base, ...over });
const ALL = [
  'Chatbox-9.0.0-macOS-AppleSilicon.zip',
  'Chatbox-9.0.0-macOS-Intel.zip',
  'Chatbox-9.0.0-Windows-Setup.exe',
  'Chatbox-9.0.0-Windows-Portable.zip',
  'Chatbox-9.0.0-Linux.deb',
  'Chatbox-9.0.0-Linux.rpm',
  'Chatbox-9.0.0-Linux.AppImage',
  'RELEASES',
  'chatbox-9.0.0-full.nupkg',
];

test('kind of install', () => {
  assert.equal(kind({ platform: 'darwin', arch: 'arm64' }), 'mac');
  assert.equal(kind({ platform: 'win32', squirrel: true }), 'squirrel');
  assert.equal(kind({ platform: 'win32', scoop: true }), 'scoop');
  assert.equal(kind({ platform: 'win32' }), 'win-portable');
  assert.equal(kind({ appImage: true }), 'appimage');
  assert.equal(kind({ debian: true }), 'deb');
  assert.equal(kind({}), 'rpm');
  // No arm64 Linux builds exist, so there is nothing to install there.
  assert.equal(kind({ arch: 'arm64', appImage: true }), 'other');
  assert.equal(kind({ platform: 'freebsd' }), 'other');
});

test('only the installer and the AppImage update unattended', () => {
  assert.deepEqual(m.UNATTENDED.toSorted(), ['appimage', 'squirrel']);
});

test('the update carries the checksum GitHub reports', () => {
  const u = m.pickUpdate(releases(ALL), '1.0.0', false, {
    ...base,
    debian: true,
  });
  assert.equal(u.fileName, 'Chatbox-9.0.0-Linux.deb');
  assert.equal(u.sha256, HASH);
  assert.equal(u.squirrelFeed, true);
});

test('a malformed or missing checksum is no checksum', () => {
  for (const digest of [null, 'md5:abc', `sha256:${'A'.repeat(64)}`, 5]) {
    const u = m.pickUpdate(releases(ALL, digest), '1.0.0', false, base);
    assert.equal(u.sha256, null);
  }
});

test('every self-installing kind can install a complete release', () => {
  for (const [name, install] of [
    ['mac', { platform: 'darwin', arch: 'arm64' }],
    ['squirrel', { platform: 'win32', squirrel: true }],
    ['scoop', { platform: 'win32', scoop: true }],
    ['appimage', { appImage: true }],
    ['deb', { debian: true }],
    ['rpm', {}],
  ]) {
    const u = m.pickUpdate(releases(ALL), '1.0.0', false, {
      ...base,
      ...install,
    });
    assert.equal(m.canInstall(name, u), true, name);
  }
});

test('never installs without a checksum, a matching file or the updater files', () => {
  const pick = (files, install, opts) =>
    m.pickUpdate(releases(files, opts), '1.0.0', false, {
      ...base,
      ...install,
    });

  // No checksum: the download can't be verified.
  const unverified = pick(ALL, { appImage: true }, null);
  assert.equal(m.canInstall('appimage', unverified), false);

  // No file for this system in the release.
  const noFile = pick(['Chatbox-9.0.0-Linux.rpm'], { debian: true });
  assert.equal(m.canInstall('deb', noFile), false);

  // Windows installer: needs RELEASES and the .nupkg.
  const noFeed = pick(['Chatbox-9.0.0-Windows-Setup.exe'], {
    platform: 'win32',
    squirrel: true,
  });
  assert.equal(m.canInstall('squirrel', noFeed), false);

  // Kinds that never install by themselves.
  const full = pick(ALL, { platform: 'win32' });
  assert.equal(m.canInstall('win-portable', full), false);
  assert.equal(m.canInstall('other', full), false);
});

test("the Windows updater's feed is the release's download folder", () => {
  assert.equal(
    m.releaseFilesUrl('9.0.0-beta'),
    'https://github.com/MineRaphi/chatbox/releases/download/v9.0.0-beta',
  );
  assert.equal(m.isSafeUrl(m.releaseFilesUrl('9.0.0')), true);
});

test('package install commands', () => {
  assert.deepEqual(m.packageInstallCommand('deb', '/tmp/c.deb'), [
    'dpkg',
    '-i',
    '/tmp/c.deb',
  ]);
  // --oldpackage: rpm sorts 2.1.0 below 2.1.0.beta.
  assert.deepEqual(m.packageInstallCommand('rpm', '/tmp/c.rpm'), [
    'rpm',
    '-U',
    '--oldpackage',
    '/tmp/c.rpm',
  ]);
});

test('the Scoop script waits for Chatbox, updates, and restarts the current version', () => {
  const script = m.scoopUpdateScript(
    4242,
    "C:\\Users\\O'Brien\\scoop\\apps\\chatbox\\2.0.11-beta\\Chatbox.exe",
  );
  const lines = script.split('\r\n');
  const at = (text) => lines.findIndex((l) => l.includes(text));
  assert.ok(at('Wait-Process -Id 4242') >= 0);
  assert.ok(at('Wait-Process') < at('scoop update chatbox'));
  assert.ok(at('scoop update chatbox') < at('Start-Process'));
  // Starts Scoop's "current" link, not the old version's folder, and a
  // quote in the path can't end the string.
  assert.ok(
    script.includes(
      "Start-Process -FilePath 'C:\\Users\\O''Brien\\scoop\\apps\\chatbox\\current\\Chatbox.exe'",
    ),
  );
});
