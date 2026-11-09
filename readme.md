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

Pre-built downloads aren't published yet. To build an installer for your own platform:

```bash
npm install
npm run make     # output in out/make
```

macOS gives a `.zip` with `Chatbox.app`; Windows a Squirrel installer; Linux `.deb` and `.rpm` packages.

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
