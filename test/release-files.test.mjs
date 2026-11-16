// Release file names: what each built file is called on the Releases page.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { releaseName } from '../scripts/collect-release-files.mjs';
const { assetPatternFor } = await import('../src/main/update-check.ts');

const V = '2.1.0-beta';
// What `npm run make` produces, and what it's released as.
const BUILT = {
  'Chatbox-darwin-arm64-2.1.0-beta.zip':
    'Chatbox-2.1.0-beta-macOS-AppleSilicon.zip',
  'Chatbox-darwin-x64-2.1.0-beta.zip': 'Chatbox-2.1.0-beta-macOS-Intel.zip',
  'Chatbox-Setup.exe': 'Chatbox-2.1.0-beta-Windows-Setup.exe',
  'Chatbox-win32-x64-2.1.0-beta.zip': 'Chatbox-2.1.0-beta-Windows-Portable.zip',
  'chatbox_2.1.0.beta_amd64.deb': 'Chatbox-2.1.0-beta-Linux.deb',
  'chatbox-2.1.0.beta-1.x86_64.rpm': 'Chatbox-2.1.0-beta-Linux.rpm',
  'Chatbox-2.1.0-beta-x64.AppImage': 'Chatbox-2.1.0-beta-Linux.AppImage',
};

test('every built file gets its release name', () => {
  for (const [built, released] of Object.entries(BUILT)) {
    assert.equal(releaseName(built, V), released);
  }
});

test("the Windows updater's files keep their names", () => {
  assert.equal(releaseName('RELEASES', V), 'RELEASES');
  assert.equal(
    releaseName('chatbox-2.1.0-beta-full.nupkg', V),
    'chatbox-2.1.0-beta-full.nupkg',
  );
  assert.equal(releaseName('something-else.txt', V), null);
});

test('the update check finds exactly one release file per kind of install', () => {
  const released = Object.values(BUILT);
  const base = {
    arch: 'x64',
    squirrel: false,
    scoop: false,
    appImage: false,
    debian: false,
  };
  const installs = [
    [{ ...base, platform: 'darwin', arch: 'arm64' }, 'macOS-AppleSilicon.zip'],
    [{ ...base, platform: 'darwin' }, 'macOS-Intel.zip'],
    [{ ...base, platform: 'win32', squirrel: true }, 'Windows-Setup.exe'],
    [{ ...base, platform: 'win32' }, 'Windows-Portable.zip'],
    [{ ...base, platform: 'linux', appImage: true }, 'Linux.AppImage'],
    [{ ...base, platform: 'linux', debian: true }, 'Linux.deb'],
    [{ ...base, platform: 'linux' }, 'Linux.rpm'],
  ];
  for (const [install, ending] of installs) {
    const matches = released.filter((name) =>
      assetPatternFor(install).test(name),
    );
    assert.deepEqual(matches, [`Chatbox-${V}-${ending}`]);
  }
});
