# Chatbox

Pick a 7TV emote and it pops up on top of the screens of everyone in your group.

> Work in progress: this is the `rework` branch. The design doc tracks what's planned.
> Right now the app is a tray icon with a placeholder picker.

## Requirements

- [Node.js](https://nodejs.org) 22 or newer
- A running [chatbox-server](https://github.com/MineRaphi/chatbox-server)

## Development

```bash
npm install
npm start          # run in dev mode with hot reload
npm run check      # typecheck + lint
npm run make       # build installers into out/make
```

The app lives in the tray (menu bar on macOS) and has no dock icon.

## Project layout

```
src/
  main/       Electron main process: tray, windows, state
  preload/    typed bridges between main and each window
  shared/     IPC channel names and types used on both sides
  renderer/
    picker/   emote picker (Svelte + Tailwind)
assets/       tray icons, shipped next to the app
icons/        app icons for packaging
```
