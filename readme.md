# Chatbox

Pick a 7TV emote and it pops up on top of the screens of everyone on your server.

Chatbox lives in the tray (the menu bar on macOS). Press a hotkey, search, hit Enter: the emote appears on your friends' screens for a few seconds, always on top, without stealing focus or blocking clicks.

## Features

- **Emote picker** with search, keyboard navigation and a row of up to 10 favorites
- **Overlay** on top of everything, including fullscreen apps, on one or all screens
- **Any 7TV emote set**: paste a 7tv.app link, old or new format
- **Do not disturb** to mute incoming emotes; your own still show
- Optional limits: max 5 emotes on screen, max 10 incoming per 10 seconds (both off by default)
- Works offline with the last emotes it loaded; reconnects to the server by itself

## Using it

1. Start a [chatbox-server](https://github.com/MineRaphi/chatbox-server) v2 (`npm install && npm start`, port 3847). The old v1 server doesn't work with this app.
2. Start Chatbox. On first run it asks for the server address.
3. Press **⌘⇧E** (macOS) or **Ctrl+Shift+E** (Windows, Linux) to open the picker.

| In the picker          | Does             |
| ---------------------- | ---------------- |
| Type                   | Search emotes    |
| Arrow keys, Enter      | Pick and send    |
| Click                  | Send             |
| Star (on hover)        | Pin to favorites |
| Right-click a favorite | Unpin it         |
| Esc, or click outside  | Close            |

Everything else (hotkey, overlay size and duration, screens, limits, emote sets, launch at login) is in **Settings**: the gear in the picker, or **Settings…** in the tray menu.

The tray icon shows the state at a glance: normal when connected, dimmed when there's no server or the connection is down, crossed out during Do not disturb.

**Groups:** everyone on the same server with the same group code sees each other's emotes, with the sender's name underneath (Settings can hide it). Leave the code empty to use the server's shared default group. The picker footer and the tray show your group and how many people are online; hover the footer to see who.

## Installing

Download the latest version from the [Releases page](https://github.com/MineRaphi/chatbox/releases/latest).

Chatbox isn't signed with a paid Apple or Microsoft certificate, so both systems warn about it the first time. That's expected; you approve it once.

### macOS

1. Download the zip for your Mac: `Chatbox-darwin-arm64-….zip` for Apple Silicon (M1 and newer), `Chatbox-darwin-x64-….zip` for Intel. Not sure? Apple menu → About This Mac: "Chip: Apple M…" means Apple Silicon.
2. Double-click the zip and move `Chatbox.app` to **Applications**.
3. Open it. macOS says it can't check the app for malware; click **Done** (not Move to Trash).
4. Open **System Settings → Privacy & Security**, scroll down to "Chatbox was blocked", and click **Open Anyway**. Confirm with your password.

From then on it opens normally. Chatbox lives in the menu bar (no Dock icon); on first start it asks for your server.

### Windows

1. Download `Chatbox-Setup.exe` and run it.
2. If SmartScreen shows "Windows protected your PC", click **More info → Run anyway**.
3. Chatbox installs for your user (no admin rights needed), adds a Start menu entry and starts in the tray. Windows often hides new tray icons behind the **^** arrow next to the clock; drag it onto the taskbar to keep it visible.

If you'd rather not install anything, `Chatbox-win32-x64-….zip` is a portable version: unzip it anywhere and run `Chatbox.exe`.

If Windows Defender blocks or removes files, open **Windows Security → Virus & threat protection → Protection history**, select the Chatbox entry, and choose **Allow**.

### Linux

64-bit Intel/AMD (x86_64) only for now.

- **Ubuntu, Debian, Mint:** download `chatbox_…_amd64.deb`, then `sudo apt install ./chatbox_*_amd64.deb`
- **Fedora, openSUSE:** download `chatbox-….x86_64.rpm`, then `sudo dnf install ./chatbox-*.x86_64.rpm`

Start it from the app menu or with `chatbox`. To remove it: `sudo apt remove chatbox` or `sudo dnf remove chatbox`.

**Arch, NixOS and other distributions:** use the AppImage, `Chatbox-….AppImage`, a single file that needs no installation.

- **Arch and most others:** `chmod +x Chatbox-*.AppImage`, then run it. AppImages need FUSE (`fuse3` on Arch); without it, run it with `--appimage-extract-and-run`.
- **NixOS:** run it with `nix run nixpkgs#appimage-run -- ./Chatbox-*.AppImage`, or add `appimage-run` to `environment.systemPackages` and use `appimage-run ./Chatbox-*.AppImage`. To run AppImages directly (needed for **Launch at login**, which starts the AppImage file itself), set in `configuration.nix`:

  ```nix
  programs.appimage = {
    enable = true;
    binfmt = true;
  };
  ```

The AppImage uses Chromium's user-namespace sandbox, which Arch and NixOS allow. Ubuntu 24.04 and newer restrict it, so on Ubuntu use the `.deb`.

On GNOME (Ubuntu's default desktop) the tray icon needs the AppIndicator extension; Ubuntu ships it enabled, other GNOME setups may need it installed.

### Publishing a release

Releases are built by GitHub Actions (`.github/workflows/release.yml`) on real macOS, Windows and Linux machines:

1. Set the new version in `package.json`, e.g. `"version": "2.0.1"`, and commit.
2. Tag and push: `git tag v2.0.1 && git push origin main v2.0.1`.
3. The workflow builds macOS (Apple Silicon and Intel), Windows and Linux and attaches everything to a **draft** release. When all four builds are done, open the draft on GitHub, check it, and click **Publish**.

The tag has to match the version in `package.json`, or the workflow stops. A version with a suffix, like `2.0.0-beta` (tag `v2.0.0-beta`), becomes a pre-release on GitHub, so the Releases page's "latest" link keeps pointing at the last stable version. Running the workflow by hand from the Actions tab only builds, without a release; the files are then under the run's artifacts.

To build only for your own machine: `npm run make` (output in `out/make`).

## Development

Requires [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install
npm start          # dev mode with hot reload
npm run check      # typecheck (tsc + svelte-check) and lint (oxlint + oxfmt)
npm run lint:fix   # format and auto-fix
```

Dev runs add a **Debug** submenu to the tray for sending test emotes locally or through the server, including bursts of 5, 8, 10 and 15.

### Project layout

```
src/
  main/          Electron main process; owns all state
    index.ts       startup, single-instance lock
    store.ts       settings (electron-store), validated, change events
    connection.ts  socket.io client, auto-reconnect
    overlay.ts     one transparent click-through window per display
    picker.ts      picker window
    emotes.ts      7TV sets, disk cache
    hotkey.ts      global shortcut
    tray.ts        tray icon and menu
    favorites.ts, autostart.ts, ipc.ts, paths.ts
  preload/       typed bridges exposed to each window
  shared/ipc.ts  IPC channel names and types used on both sides
  renderer/
    picker/      Svelte 5 + Tailwind
    overlay/     plain TypeScript
assets/          tray icons (generated)
icons/           app icons for packaging
scripts/         generate-tray-icons.py
```

Renderers never keep state of their own: they ask main and listen for changes. Every value a renderer sends is validated in main before it's stored or used.

### Tray icons

`assets/tray*.png` are generated from `icons/chatbox.png`. After changing the app icon:

```bash
pip install pillow
python3 scripts/generate-tray-icons.py
```

## Where things are stored

| Platform | Folder                                   |
| -------- | ---------------------------------------- |
| macOS    | `~/Library/Application Support/Chatbox/` |
| Windows  | `%APPDATA%\Chatbox\`                     |
| Linux    | `~/.config/Chatbox/`                     |

`config.json` holds the settings, `emote-cache.json` the downloaded emote lists. Deleting either is safe; Chatbox recreates them.

## Troubleshooting

- **The hotkey does nothing.** Another app may own it. Settings shows a warning if so; record a different one.
- **No emotes from friends.** Check the tray: is it connected, and is Do not disturb off? Everyone must be on the same server.
- **"Not connected, only you saw that."** The server can't be reached, or you haven't joined a group. Settings explains what failed.
- **"This server is too old for this version of Chatbox."** The server is still v1; it needs chatbox-server v2.
- **"Slow down"** in the picker: the server's rate limit (30 emotes per 10 seconds by default) dropped some of yours.
- **Linux: no tray icon.** GNOME needs the AppIndicator extension.
- **Linux: the overlay is black or missing.** Transparent windows need a running compositor.
- **Linux on Wayland: the hotkey doesn't work.** It goes through the desktop's GlobalShortcuts portal, which not every desktop supports yet. Open the picker from the tray instead.
