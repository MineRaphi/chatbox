// Writes bucket/chatbox.json, the Scoop manifest, for one GitHub release.
// Reads the release as JSON (GitHub API format) from stdin:
//
//   gh api repos/MineRaphi/chatbox/releases/tags/v2.1.0 | node scripts/update-scoop-manifest.mjs
//
// Run by .github/workflows/scoop.yml whenever a release is published.
import { writeFileSync } from 'node:fs';
import { text } from 'node:stream/consumers';

const release = JSON.parse(await text(process.stdin));
const tag = release.tag_name;
if (
  typeof tag !== 'string' ||
  !/^v\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(tag)
) {
  throw new Error(`unexpected release tag: ${tag}`);
}
if (release.draft) throw new Error(`${tag} is still a draft`);

// Scoop installs the portable zip: no installer, nothing outside its folder.
const asset = (release.assets ?? []).find((a) =>
  /^Chatbox-win32-x64-.+\.zip$/.test(a.name),
);
if (!asset) throw new Error(`${tag} has no Windows zip`);

const url = asset.browser_download_url;
const prefix = 'https://github.com/MineRaphi/chatbox/releases/download/';
if (typeof url !== 'string' || !url.startsWith(prefix)) {
  throw new Error(`unexpected download link: ${url}`);
}
// GitHub computes this when the file is uploaded.
const hash = /^sha256:([0-9a-f]{64})$/.exec(asset.digest ?? '')?.[1];
if (!hash) throw new Error(`${asset.name} has no sha256 digest`);

const manifest = {
  version: tag.slice(1),
  description: "Send 7TV emotes that pop up on top of your friends' screens",
  homepage: 'https://github.com/MineRaphi/chatbox',
  license: 'GPL-3.0-only',
  architecture: { '64bit': { url, hash } },
  shortcuts: [['Chatbox.exe', 'Chatbox']],
  notes: 'Chatbox starts in the tray. Settings are kept in %APPDATA%\\Chatbox.',
};

const file = new URL('../bucket/chatbox.json', import.meta.url);
writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
console.log(`bucket/chatbox.json: ${manifest.version} (${asset.name})`);
