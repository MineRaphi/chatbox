# Chatbox

Send 7TV emotes onto your friends' screens.

Chatbox lives in the tray (the menu bar on macOS). Press a hotkey, search for an emote and hit Enter: it pops up on the screen of everyone in your group for a few seconds, on top of everything, without stealing focus or blocking clicks. Chatbox runs on macOS, Windows and Linux.

## Contents

- [What you need](#what-you-need)
- [Installing](#installing)
  - [macOS](#macos)
  - [Windows](#windows)
  - [Linux](#linux)
- [Setting up](#setting-up)
- [Sending emotes](#sending-emotes)
  - [The picker](#the-picker)
  - [Favorites](#favorites)
  - [The tray icon](#the-tray-icon)
- [Settings](#settings)
  - [Emote sets](#emote-sets)
  - [The overlay](#the-overlay)
  - [Do not disturb](#do-not-disturb)
  - [Updates](#updates)
  - [Where settings are stored](#where-settings-are-stored)
- [Linux desktops](#linux-desktops)
  - [Wayland](#wayland)
  - [GNOME](#gnome)
  - [Hyprland and other tiling window managers](#hyprland-and-other-tiling-window-managers)
- [Troubleshooting](#troubleshooting)
- [Running your own server](#running-your-own-server)
- [Development](#development)
- [License and disclaimer](#license-and-disclaimer)

## What you need

- **Chatbox** on every computer that should send or show emotes.
- **A Chatbox server** that everyone connects to. Usually one person in the group runs it, and everyone else just needs its address. If nobody does yet, see [Running your own server](#running-your-own-server).
- **The same group code** for everyone who should see each other's emotes, chosen by you and your friends. Several groups can share one server without seeing each other.

## Installing

Download the latest version from the [Releases page](https://github.com/MineRaphi/chatbox/releases/latest).

Chatbox isn't signed with a paid Apple or Microsoft certificate, so macOS and Windows warn about it the first time. That's expected; you approve it once.

### macOS

1. Download the zip for your Mac: `Chatbox-…-macOS-AppleSilicon.zip` for Apple Silicon (M1 and newer), `Chatbox-…-macOS-Intel.zip` for Intel. Not sure? Apple menu → About This Mac: "Chip: Apple M…" means Apple Silicon.
2. Double-click the zip and move `Chatbox.app` to **Applications**.
3. Open it. macOS says it can't check the app for malware; click **Done** (not Move to Trash).
4. Open **System Settings → Privacy & Security**, scroll down to "Chatbox was blocked", and click **Open Anyway**. Confirm with your password.

From then on it opens normally. Chatbox appears in the menu bar and has no Dock icon.

### Windows

There are two ways to install Chatbox: the installer, or [Scoop](https://scoop.sh), a package manager for the terminal. With Scoop there's no SmartScreen warning, and updating is one command.

**With the installer:**

1. Download `Chatbox-…-Windows-Setup.exe` and run it.
2. If SmartScreen shows "Windows protected your PC", click **More info → Run anyway**.
3. Chatbox installs for your user (no admin rights needed), adds a Start menu entry and starts in the tray.

**With Scoop:** if you don't have Scoop yet, install it first with the command on [scoop.sh](https://scoop.sh). Then, in PowerShell:

```powershell
scoop bucket add chatbox https://github.com/MineRaphi/chatbox
scoop install chatbox
```

Start Chatbox from the Start menu. To update it later, quit Chatbox from its tray menu and run `scoop update chatbox`. To remove it: `scoop uninstall chatbox`.

Scoop installs the newest published version, beta versions included.

**After installing:** Windows often hides new tray icons behind the **^** arrow next to the clock; drag the Chatbox icon onto the taskbar to keep it visible.

**Portable version:** `Chatbox-…-Windows-Portable.zip` needs no installation. Unzip it anywhere and run `Chatbox.exe`.

**Windows Defender:** if it blocks or removes files, open **Windows Security → Virus & threat protection → Protection history**, select the Chatbox entry, and choose **Allow**.

### Linux

64-bit Intel/AMD (x86_64) only for now.

| Distribution               | Download                   | Install                                  | Remove                    |
| -------------------------- | -------------------------- | ---------------------------------------- | ------------------------- |
| Ubuntu, Debian, Mint       | `Chatbox-…-Linux.deb`      | `sudo apt install ./Chatbox-*-Linux.deb` | `sudo apt remove chatbox` |
| Fedora, openSUSE           | `Chatbox-…-Linux.rpm`      | `sudo dnf install ./Chatbox-*-Linux.rpm` | `sudo dnf remove chatbox` |
| Arch, NixOS and the others | `Chatbox-…-Linux.AppImage` | none, see below                          | delete the file           |

After installing a `.deb` or `.rpm`, start Chatbox from the app menu or with `chatbox`.

**The AppImage** is a single file that runs without installation. Put it where you want to keep it, then:

- **Arch and most others:** `chmod +x Chatbox-*.AppImage`, then run it. AppImages need FUSE (`fuse3` on Arch); without it, run it with `--appimage-extract-and-run`.
- **NixOS:** run it with `nix run nixpkgs#appimage-run -- ./Chatbox-*.AppImage`, or add `appimage-run` to `environment.systemPackages` and use `appimage-run ./Chatbox-*.AppImage`. **Launch at login** starts the AppImage file directly, which needs this in `configuration.nix`:

  ```nix
  programs.appimage = {
    enable = true;
    binfmt = true;
  };
  ```

On its first start, the AppImage adds Chatbox to your app menu. It updates that entry on every start, so moving the file is fine. To remove the entry, delete `~/.local/share/applications/chatbox.desktop`.

The AppImage uses Chromium's user-namespace sandbox, which Arch and NixOS allow. Ubuntu 24.04 and newer restrict it, so on Ubuntu use the `.deb`.

Some desktops need a little extra setup; see [Linux desktops](#linux-desktops).

## Setting up

On the first start, Chatbox opens its settings. Fill in:

1. **Server:** the address of the server (a hostname or IP address) and its port, 3847 unless whoever runs it says otherwise. Click **Save and connect**; the status at the bottom of the window shows when Chatbox is connected.
2. **You:** your **display name**, shown under your emotes on your friends' screens, and the **group code** your group agreed on. Leave the code empty to join the server's shared default group.
3. **Shortcut** (optional): the hotkey that opens the picker. The default is **⌘⇧E** on macOS and **Ctrl+Shift+E** on Windows and Linux. Click it and press the combination you want.

The other settings are saved as soon as you change them. Close the window, press the hotkey, and send your first emote.

You can open the settings again at any time with the gear in the picker or **Settings…** in the tray menu.

## Sending emotes

### The picker

Press the hotkey to open the picker, or choose **Open picker** in the tray menu.

| In the picker          | Does             |
| ---------------------- | ---------------- |
| Type                   | Search emotes    |
| Arrow keys, Enter      | Pick and send    |
| Click                  | Send             |
| Star (on hover)        | Pin to favorites |
| Right-click a favorite | Unpin it         |
| Esc, or click outside  | Close            |

The picker stays open after sending, so you can send several in a row. You see your own emotes too, the same way your friends do.

Its footer shows your group and how many people are online; hover it to see who. If you're not connected, it says so, and emotes you send only appear on your own screen.

### Favorites

Hover an emote and click its star to pin it. Up to 10 favorites sit in a row at the top of the picker, so your most-used emotes are one click away. Right-click a favorite to unpin it.

### The tray icon

The tray icon shows the state at a glance: normal when connected, dimmed when there's no server or the connection is down, crossed out during Do not disturb. Its menu shows your group and how many people are online, and has **Open picker**, **Do not disturb** and **Settings…**.

## Settings

| Section    | What's in it                                                                                |
| ---------- | ------------------------------------------------------------------------------------------- |
| Server     | Server address and port                                                                     |
| You        | Display name and group code                                                                 |
| Shortcut   | The hotkey that opens the picker                                                            |
| Overlay    | Emote size and duration, which screens, sender's name on or off, the two optional limits    |
| Emote sets | The 7TV sets to pick from                                                                   |
| Updates    | Your version, **Check now**, include beta versions                                          |
| General    | Do not disturb, launch at login, and on Linux with Wayland, [Native Wayland mode](#wayland) |

### Emote sets

Chatbox starts with 7TV's global emotes. To add more, open a set on [7tv.app](https://7tv.app), copy the link from the address bar, and paste it under **Emote sets**. Old and new 7tv.app links both work. Emotes from all your sets show up together in the picker.

Your friends don't need the same sets: they see whatever emote you send.

### The overlay

Emotes appear in a random spot on the screen and disappear after the set duration. Under **Overlay** you choose their size, how long they stay, and whether they show on your main screen or on all screens.

Two optional limits help when things get busy; both are off by default:

- **Max 5 on screen:** older emotes make room for new ones.
- **Max 10 incoming per 10 s:** extra emotes from friends are dropped.

The server also has a limit of its own, 30 emotes per 10 seconds per person by default. If you go over it, the picker shows **Slow down**.

### Do not disturb

Turn it on in the tray menu or under **General**. Emotes from friends no longer appear; yours still do, and you can keep sending.

### Updates

Chatbox checks GitHub for new versions at startup and every 6 hours. When there's one, you get a notification once, and the tray menu and **Settings → Updates** offer the download for your system. It doesn't install anything by itself. Beta versions are only offered with **Include beta versions** on.

If you installed Chatbox with Scoop, update it with `scoop update chatbox` instead of the offered download.

### Where settings are stored

| Platform | Folder                                   |
| -------- | ---------------------------------------- |
| macOS    | `~/Library/Application Support/Chatbox/` |
| Windows  | `%APPDATA%\Chatbox\`                     |
| Linux    | `~/.config/Chatbox/`                     |

`config.json` holds the settings, `emote-cache.json` the downloaded emote lists. Deleting either is safe; Chatbox recreates them.

## Linux desktops

### Wayland

Wayland doesn't let apps keep their windows on top or show them on every virtual desktop. So on a Wayland desktop, Chatbox runs through XWayland (X11 on Wayland), where both work. It switches by itself when it starts.

The trade-off: Chatbox's hotkey then only works while a Chatbox window is focused. Open the picker from the tray instead, or bind a key in your desktop's keyboard settings to start Chatbox again (`chatbox`, or the command you start the AppImage with). A second start doesn't open a second Chatbox; it opens the picker of the running one.

**Settings → General → Native Wayland mode** runs Chatbox natively on Wayland instead. Its hotkey then works everywhere through the desktop's shortcut system, but emotes can't stay on top. It takes effect after a restart.

### GNOME

The tray icon needs the AppIndicator extension. Ubuntu ships it enabled; other GNOME setups may need it installed.

### Hyprland and other tiling window managers

Tiling window managers decide for themselves where windows go and largely ignore what apps ask for, so Chatbox needs a few window rules there.

**Hyprland** (0.55 and newer, Lua config): the overlays (title `Chatbox overlay`) float on every workspace, never take focus and have no border; the picker floats in the middle of the screen.

```lua
hl.window_rule({
  name             = "chatbox-overlay",
  match            = { class = "(?i)chatbox", title = "Chatbox overlay" },
  float            = true,
  pin              = true,
  no_focus         = true,
  no_initial_focus = true,
  decorate         = false,
  border_size      = 0,
  no_blur          = true,
  no_shadow        = true,
  no_anim          = true,
})
hl.window_rule({
  name   = "chatbox-picker",
  match  = { class = "(?i)chatbox", title = "Chatbox" },
  float  = true,
  center = true,
})
```

For the hotkey, bind a key that starts Chatbox again, which opens the picker of the running one. Replace the command with the one you start Chatbox with:

```lua
hl.bind("CTRL + SHIFT + E", hl.dsp.exec_cmd("appimage-run /path/to/Chatbox.AppImage"))
```

`hyprctl clients` shows how Hyprland sees each Chatbox window (class, title, floating, pinned).

**Other tiling window managers** need similar rules: the overlays should float, show on every workspace if possible, and never take focus. niri can't show a window on every workspace, so there emotes only appear on the workspace where the overlay opened.

## Troubleshooting

- **The hotkey does nothing.** Another app may own it. Settings shows a warning if so; record a different one. On Linux with Wayland, see [Wayland](#wayland).
- **No emotes from friends.** Check the tray: is it connected, and is Do not disturb off? Everyone must be on the same server and use the same group code.
- **"Not connected, only you saw that."** The server can't be reached, or you haven't joined a group. Settings explains what failed.
- **"This server is too old for this version of Chatbox."** The server is still v1; whoever runs it needs to update to chatbox-server v2.
- **"Slow down"** in the picker: the server's rate limit (30 emotes per 10 seconds by default) dropped some of yours.
- **An emote set won't add.** Check that the link is a 7tv.app emote set link, not a user page or a single emote.
- **Linux: no tray icon.** On GNOME, see [GNOME](#gnome).
- **Linux: the overlay is black or missing.** Transparent windows need a running compositor.
- **Linux: emotes don't stay on top or don't show on other virtual desktops.** If you switched on **Native Wayland mode**, switch it off again. On a tiling window manager, see [Hyprland and other tiling window managers](#hyprland-and-other-tiling-window-managers).
- **Linux: the picker closes right away or the overlay can be moved.** Your window manager needs window rules; see [Hyprland and other tiling window managers](#hyprland-and-other-tiling-window-managers).

## Running your own server

The server, [chatbox-server](https://github.com/MineRaphi/chatbox-server), passes emotes between everyone in the same group. It has no accounts and stores nothing, so it needs very little: any always-on computer works, from a small Linux server or a Raspberry Pi to a cheap cloud server.

**With Docker** (recommended), on the machine that should run it:

```bash
git clone https://github.com/MineRaphi/chatbox-server.git
cd chatbox-server
docker compose up -d --build
```

That starts the server on port 3847 and restarts it after crashes and reboots. To update it later: `git pull && docker compose up -d --build`.

**Without Docker**, with [Node.js](https://nodejs.org) 22.18 or newer:

```bash
git clone https://github.com/MineRaphi/chatbox-server.git
cd chatbox-server
npm install --omit=dev
npm start
```

**Letting your friends connect:**

- Open port **3847** (TCP) in the server's firewall, e.g. `sudo ufw allow 3847/tcp` on Ubuntu.
- **Same network:** your friends use the server's local IP address.
- **Over the internet:** either forward port 3847 on your router to the server and give your friends your public IP address or a domain, or put everyone in a VPN such as Tailscale and use the server's VPN address.

In Chatbox, everyone then enters that address and the port under **Server**.

The [server's readme](https://github.com/MineRaphi/chatbox-server#readme) covers the rest: changing the port and the rate limit, running it as a system service without Docker, and the logs.

## Development

Requires [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install
npm start          # dev mode with hot reload
npm run check      # typecheck (tsc + svelte-check) and lint (oxlint + oxfmt)
npm run lint:fix   # format and auto-fix
npm test           # unit tests (node:test)
npm run make       # build for this machine (output in out/make)
```

Dev runs use their own settings folder, **Chatbox Dev**, so `npm start` and an installed Chatbox don't touch each other's settings and can run at the same time. The first dev start copies the installed app's settings once. Dev runs also add a **Debug** submenu to the tray for sending test emotes locally or through the server.

**How it's built:** Electron, with a Svelte 5 + Tailwind picker and a plain TypeScript overlay. The main process (`src/main/`) owns all state: settings, the server connection, the windows, the tray. Each window gets a typed bridge from `src/preload/`, never keeps state of its own, and everything it sends is validated in main before it's used.

**Tray icons:** `assets/tray*.png` are generated from `icons/chatbox.png`. After changing the app icon, run `pip install pillow` and `python3 scripts/generate-tray-icons.py`.

**Publishing a release:** GitHub Actions (`.github/workflows/release.yml`) builds and tests every release on real macOS, Windows and Linux machines.

1. Set the new version in `package.json`, e.g. `"version": "2.1.0"`, and commit.
2. Tag and push: `git tag v2.1.0 && git push origin main v2.1.0`.
3. The workflow builds macOS (Apple Silicon and Intel), Windows and Linux and attaches everything to a **draft** release. When all four builds are done, open the draft on GitHub, check it, and click **Publish**.

Publishing also starts a second workflow (`.github/workflows/scoop.yml`), which points the Scoop manifest, `bucket/chatbox.json`, at the new version and commits it to `main`. Pull before you continue working.

The tag has to match the version in `package.json`, or the workflow stops. A version with a suffix, like `2.1.0-beta`, becomes a pre-release, so the Releases page's "latest" link keeps pointing at the last stable version. Running the workflow by hand from the Actions tab only builds; the files are then under the run's artifacts.

## License and disclaimer

Copyright (c) 2025-2026 MineRaphi

Chatbox is free software, licensed under the [GNU General Public License v3.0](LICENSE) (GPL-3.0). You may use, change and share it, also for money, as long as anyone you give a copy to gets the full source code, including your changes, under the same license. The copyright notice must stay, and changes must be marked.

This software is provided "as is", without warranty of any kind. Use it at your own risk; the author is not liable for any damage or loss resulting from its use. The builds are unsigned and not reviewed by Apple or Microsoft.

Chatbox is a hobby project and is not affiliated with or endorsed by 7TV. Emotes are loaded from 7TV and belong to their respective creators.
