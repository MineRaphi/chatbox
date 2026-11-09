// Update check logic: version order and which release/file is offered.
// Run with npm test (Node runs the TypeScript module directly).
import assert from 'node:assert/strict';
import { test } from 'node:test';
const m = await import('../src/main/update-check.ts');
const v = (s) => m.parseVersion(s);
const cmp = (a, b) => Math.sign(m.compareVersions(v(a), v(b)));

test('version order (semver)', () => {
  assert.equal(cmp('2.0.1', '2.0.0'), 1);
  assert.equal(cmp('2.0.1-beta', '2.0.0'), 1);
  assert.equal(cmp('2.0.1', '2.0.1-beta'), 1); // release beats its beta
  assert.equal(cmp('2.0.1-beta.2', '2.0.1-beta'), 1);
  assert.equal(cmp('2.0.1-beta.10', '2.0.1-beta.9'), 1);
  assert.equal(cmp('2.0.1-alpha', '2.0.1-beta'), -1);
  assert.equal(cmp('v2.0.1-beta', '2.0.1-beta'), 0);
  assert.equal(cmp('10.0.0', '9.9.9'), 1);
  assert.equal(m.parseVersion('nope'), null);
});

const base = 'https://github.com/MineRaphi/chatbox/releases';
const rel = (tag, { prerelease = false, draft = false, files = [] } = {}) => ({
  tag_name: tag,
  prerelease,
  draft,
  html_url: `${base}/tag/${tag}`,
  assets: files.map((name) => ({
    name,
    browser_download_url: `${base}/download/${tag}/${name}`,
  })),
});
// Tests must not depend on the machine they run on (CI runs on Linux).
const mac = {
  platform: 'darwin',
  arch: 'arm64',
  squirrel: false,
  appImage: false,
  debian: false,
};

const macFiles = (ver) => [
  `Chatbox-darwin-arm64-${ver}.zip`,
  `Chatbox-darwin-x64-${ver}.zip`,
  'Chatbox-Setup.exe',
];
const feed = [
  rel('v2.0.0-beta', { prerelease: true, files: macFiles('2.0.0-beta') }),
  rel('v2.0.1-beta', { prerelease: true, files: macFiles('2.0.1-beta') }),
  rel('v2.0.2', { files: macFiles('2.0.2') }),
  rel('v2.1.0-beta', { prerelease: true, files: macFiles('2.1.0-beta') }),
  rel('v3.0.0', { draft: true, files: macFiles('3.0.0') }),
];

test('stable only: newest stable, never drafts', () => {
  const u = m.pickUpdate(feed, '2.0.1-beta', false, mac);
  assert.equal(u.version, '2.0.2');
  assert.equal(u.prerelease, false);
  assert.equal(u.fileName, 'Chatbox-darwin-arm64-2.0.2.zip');
  assert.ok(u.downloadUrl.startsWith(`${base}/download/v2.0.2/`));
});

test('with betas: newest including pre-releases', () => {
  assert.equal(m.pickUpdate(feed, '2.0.1-beta', true).version, '2.1.0-beta');
});

test('nothing newer: null', () => {
  assert.equal(m.pickUpdate(feed, '2.0.2', false), null);
  assert.equal(m.pickUpdate(feed, '2.1.0-beta', true), null);
});

test('links outside the repo are ignored', () => {
  const evil = [
    {
      ...rel('v9.0.0', { files: macFiles('9.0.0') }),
      html_url: 'https://evil.example/x',
    },
  ];
  assert.equal(m.pickUpdate(evil, '2.0.0', false), null);
  const evilAsset = [rel('v9.0.0', { files: [] })];
  evilAsset[0].assets = [
    {
      name: 'Chatbox-darwin-arm64-9.0.0.zip',
      browser_download_url: 'https://evil.example/a.zip',
    },
    {
      name: 'Chatbox-darwin-x64-9.0.0.zip',
      browser_download_url: 'https://evil.example/b.zip',
    },
  ];
  const u = m.pickUpdate(evilAsset, '2.0.0', false);
  assert.equal(u.fileName, null, 'unsafe asset must not be offered');
  assert.equal(
    u.downloadUrl,
    `${base}/tag/v9.0.0`,
    'falls back to the release page',
  );
});

test('garbage from the API throws, odd entries are skipped', () => {
  assert.throws(() =>
    m.pickUpdate({ message: 'rate limited' }, '2.0.0', false),
  );
  assert.equal(m.pickUpdate([null, 42, { tag_name: 5 }], '2.0.0', false), null);
});

test('the right file for each platform and install type', () => {
  // File names as the release workflow produces them (from v2.0.1-beta).
  const files = [
    'Chatbox-darwin-arm64-2.0.2.zip',
    'Chatbox-darwin-x64-2.0.2.zip',
    'Chatbox-Setup.exe',
    'Chatbox-win32-x64-2.0.2.zip',
    'chatbox-2.0.2-full.nupkg',
    'RELEASES',
    'Chatbox-2.0.2-x64.AppImage',
    'chatbox_2.0.2_amd64.deb',
    'chatbox-2.0.2-1.x86_64.rpm',
  ];
  const release = [rel('v2.0.2', { files })];
  const pick = (install) =>
    m.pickUpdate(release, '2.0.1', false, { ...mac, ...install }).fileName;

  assert.equal(
    pick({ platform: 'darwin', arch: 'arm64' }),
    'Chatbox-darwin-arm64-2.0.2.zip',
  );
  assert.equal(
    pick({ platform: 'darwin', arch: 'x64' }),
    'Chatbox-darwin-x64-2.0.2.zip',
  );
  assert.equal(
    pick({ platform: 'win32', arch: 'x64', squirrel: true }),
    'Chatbox-Setup.exe',
  );
  assert.equal(
    pick({ platform: 'win32', arch: 'x64', squirrel: false }),
    'Chatbox-win32-x64-2.0.2.zip',
  );
  assert.equal(
    pick({ platform: 'linux', arch: 'x64', appImage: true, debian: true }),
    'Chatbox-2.0.2-x64.AppImage',
  );
  assert.equal(
    pick({ platform: 'linux', arch: 'x64', debian: true }),
    'chatbox_2.0.2_amd64.deb',
  );
  assert.equal(
    pick({ platform: 'linux', arch: 'x64', debian: false }),
    'chatbox-2.0.2-1.x86_64.rpm',
  );
  assert.equal(pick({ platform: 'freebsd', arch: 'x64' }), null);
});
