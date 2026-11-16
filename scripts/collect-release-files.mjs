// Copies the files built by `npm run make` (out/make/**) into out/release
// under the names people see on the Releases page:
//
//   Chatbox-2.1.0-macOS-AppleSilicon.zip   Chatbox-2.1.0-Windows-Setup.exe
//   Chatbox-2.1.0-macOS-Intel.zip          Chatbox-2.1.0-Windows-Portable.zip
//   Chatbox-2.1.0-Linux.deb  Chatbox-2.1.0-Linux.rpm  Chatbox-2.1.0-Linux.AppImage
//
// The update check (src/main/update-check.ts) and the Scoop manifest
// (scripts/update-scoop-manifest.mjs) look for these names; change them
// together.
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The release name for a file from out/make, or null for files that aren't
 * released (Squirrel's RELEASES and .nupkg, which only its own updater
 * would use).
 */
export function releaseName(file, version) {
  const name = path.basename(file);
  const base = `Chatbox-${version}`;
  if (name.endsWith('.AppImage')) return `${base}-Linux.AppImage`;
  if (name.endsWith('.deb')) return `${base}-Linux.deb`;
  if (name.endsWith('.rpm')) return `${base}-Linux.rpm`;
  if (name.endsWith('.exe')) return `${base}-Windows-Setup.exe`;
  if (name.endsWith('.zip')) {
    if (name.includes('win32')) return `${base}-Windows-Portable.zip`;
    if (name.includes('darwin-arm64')) return `${base}-macOS-AppleSilicon.zip`;
    if (name.includes('darwin-x64')) return `${base}-macOS-Intel.zip`;
  }
  return null;
}

function main() {
  const root = path.resolve(fileURLToPath(import.meta.url), '../..');
  const { version } = JSON.parse(
    readFileSync(path.join(root, 'package.json'), 'utf8'),
  );
  const from = path.join(root, 'out', 'make');
  const to = path.join(root, 'out', 'release');
  rmSync(to, { recursive: true, force: true });
  mkdirSync(to, { recursive: true });

  const copied = new Set();
  for (const entry of readdirSync(from, {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!entry.isFile()) continue;
    const name = releaseName(entry.name, version);
    if (!name) continue;
    if (copied.has(name)) throw new Error(`two files would be named ${name}`);
    copied.add(name);
    cpSync(path.join(entry.parentPath, entry.name), path.join(to, name));
    console.log(`${entry.name} -> ${name}`);
  }
  if (copied.size === 0) throw new Error(`nothing to release in ${from}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
