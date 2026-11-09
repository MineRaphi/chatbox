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
  const u = m.pickUpdate(feed, '2.0.1-beta', false);
  assert.equal(u.version, '2.0.2');
  assert.equal(u.prerelease, false);
  assert.equal(
    u.fileName,
    `Chatbox-darwin-${process.arch === 'arm64' ? 'arm64' : 'x64'}-2.0.2.zip`,
  );
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
