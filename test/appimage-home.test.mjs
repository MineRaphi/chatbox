// Linux AppImage: moving itself to ~/Applications/Chatbox.AppImage.
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
const m = await import('../src/main/appimage-home.ts');

let root;
let home;
let downloads;
let recordFile;
beforeEach(() => {
  // Resolved, because macOS's temp folder is itself a link.
  root = realpathSync(mkdtempSync(path.join(tmpdir(), 'chatbox-home-')));
  home = path.join(root, 'home');
  downloads = path.join(home, 'Downloads');
  recordFile = path.join(home, '.config', 'Chatbox', 'appimage-home.json');
  mkdirSync(downloads, { recursive: true });
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const target = () => m.homePath(home);
const launcher = () => path.join(home, '.local', 'bin', 'chatbox');
/** A fake AppImage whose content is its version. */
function download(version, name = `Chatbox-${version}-Linux.AppImage`) {
  const file = path.join(downloads, name);
  writeFileSync(file, version);
  return file;
}
const settle = (appImage, version) =>
  m.settleAppImage({
    appImage,
    homeDir: home,
    version,
    recordFile,
    isNewer: (a, b) => a > b, // enough for the versions used here
    launcherExec: (p) => `"${p}"`,
  });

test('first start: moves to ~/Applications under a fixed name', () => {
  const file = download('2.1.0');
  assert.equal(settle(file, '2.1.0'), target());
  assert.equal(existsSync(file), false);
  assert.equal(readFileSync(target(), 'utf8'), '2.1.0');
  assert.equal(statSync(target()).mode & 0o111, 0o111); // executable
});

test('adds a chatbox command that starts it', () => {
  settle(download('2.1.0'), '2.1.0');
  const script = readFileSync(launcher(), 'utf8');
  assert.match(script, /^#!\/bin\/sh\n/);
  assert.ok(script.includes(`exec "${target()}" "$@"`));
  assert.equal(statSync(launcher()).mode & 0o111, 0o111);
});

test('tells the user once where it moved from', () => {
  const file = download('2.1.0');
  settle(file, '2.1.0');
  assert.equal(m.takeMoveNotice(recordFile), file);
  assert.equal(m.takeMoveNotice(recordFile), null);
});

test('starting from home changes nothing and announces nothing', () => {
  settle(download('2.1.0'), '2.1.0');
  m.takeMoveNotice(recordFile);
  assert.equal(settle(target(), '2.1.0'), target());
  assert.equal(readFileSync(target(), 'utf8'), '2.1.0');
  assert.equal(m.takeMoveNotice(recordFile), null);
});

test('a newer download replaces the copy at home', () => {
  settle(download('2.1.0'), '2.1.0');
  const newer = download('2.2.0');
  assert.equal(settle(newer, '2.2.0'), target());
  assert.equal(readFileSync(target(), 'utf8'), '2.2.0');
  assert.equal(existsSync(newer), false);
});

test('an older or equal download never replaces it, and stays where it is', () => {
  settle(download('2.2.0'), '2.2.0');
  for (const version of ['2.1.0', '2.2.0']) {
    const file = download(version, `again-${version}.AppImage`);
    assert.equal(settle(file, version), file);
    assert.equal(existsSync(file), true);
    assert.equal(readFileSync(target(), 'utf8'), '2.2.0');
  }
});

test('after an in-app update, the new version at home is remembered', () => {
  settle(download('2.1.0'), '2.1.0');
  writeFileSync(target(), '2.2.0'); // the updater replaced the file
  assert.equal(settle(target(), '2.2.0'), target());
  // So an old 2.1.5 download can't replace it now.
  const old = download('2.1.5');
  assert.equal(settle(old, '2.1.5'), old);
  assert.equal(readFileSync(target(), 'utf8'), '2.2.0');
});

test("a copy at home of unknown version isn't touched", () => {
  mkdirSync(path.dirname(target()), { recursive: true });
  writeFileSync(target(), 'put here by hand');
  const file = download('2.1.0');
  assert.equal(settle(file, '2.1.0'), file);
  assert.equal(readFileSync(target(), 'utf8'), 'put here by hand');
});

test("someone else's chatbox command is left alone", () => {
  mkdirSync(path.dirname(launcher()), { recursive: true });
  writeFileSync(launcher(), '#!/bin/sh\necho mine\n');
  settle(download('2.1.0'), '2.1.0');
  assert.equal(readFileSync(launcher(), 'utf8'), '#!/bin/sh\necho mine\n');

  rmSync(launcher());
  symlinkSync('/somewhere/else', launcher());
  settle(target(), '2.1.0');
  assert.equal(existsSync(path.join(home, '.local', 'bin')), true);
  assert.throws(() => readFileSync(launcher(), 'utf8')); // still the dangling link
});

test("stays put when ~/Applications can't be created", () => {
  writeFileSync(path.join(home, 'Applications'), 'a file, not a folder');
  const file = download('2.1.0');
  assert.equal(settle(file, '2.1.0'), file);
  assert.equal(existsSync(file), true);
  assert.equal(m.takeMoveNotice(recordFile), null);
});

test('a missing AppImage path is returned unchanged', () => {
  assert.equal(
    settle('/nowhere/Chatbox.AppImage', '2.1.0'),
    '/nowhere/Chatbox.AppImage',
  );
});
