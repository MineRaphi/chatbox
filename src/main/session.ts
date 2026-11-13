import { spawn } from 'node:child_process';
import { app } from 'electron';
import { getSetting } from './store';

// On a Wayland desktop, apps can't keep their windows on top or put them on
// every virtual desktop; only the compositor decides that. Electron runs
// natively on Wayland by default, so the emote overlays would sink behind
// other windows and stay on one desktop. Through XWayland (X11 on Wayland)
// both hints work. The trade-off: global shortcuts may only work while a
// Chatbox window is focused, so native Wayland stays available as a setting.
//
// Electron picks Wayland or X11 before any of our code runs, so
// app.commandLine.appendSwitch('ozone-platform', ...) is too late (tested:
// it still tried Wayland). It has to be a real command-line argument, so
// Chatbox starts an X11 copy of itself and exits. That's a plain spawn, not
// app.relaunch: on Linux, relaunch goes through a helper process and its
// X11 copy silently never ran on GitHub's Ubuntu runner. A spawned copy
// starts at once and shares stdout/stderr, so any failure shows up in logs.

export const X11_FLAG = '--ozone-platform=x11';

let waylandSession = false;
let nativeWayland = false;

/**
 * On a Wayland session (unless native Wayland mode is on), make sure this
 * process runs on X11. Returns true when it started an X11 copy of itself,
 * in which case the caller must exit right away. Call only while holding
 * the single-instance lock (so a second launch, e.g. from a window
 * manager keybind, goes straight to the running Chatbox instead of
 * starting a copy first); it hands the lock over to the copy. Call after
 * the settings folder is final (dev profile), since it reads a setting.
 */
export function relaunchOnX11IfNeeded(): boolean {
  if (process.platform !== 'linux') return false;
  waylandSession =
    process.env.XDG_SESSION_TYPE === 'wayland' ||
    Boolean(process.env.WAYLAND_DISPLAY);
  if (!waylandSession) return false;

  // What this process actually runs on (the flag decides, not the setting).
  nativeWayland = !process.argv.includes(X11_FLAG);
  if (!nativeWayland || getSetting('linuxNativeWayland')) return false;

  // An AppImage must be started through the AppImage file, not the binary
  // inside its temporary mount.
  const executable = process.env.APPIMAGE ?? process.execPath;
  const args = [...process.argv.slice(1), X11_FLAG];
  console.log(
    `[session] Wayland session: starting on XWayland: ${executable} ${args.join(' ')}`,
  );
  // The copy needs the single-instance lock.
  app.releaseSingleInstanceLock();
  const child = spawn(executable, args, { detached: true, stdio: 'inherit' });
  child.on('error', (err) => {
    console.error('[session] could not start the XWayland copy:', err);
  });
  child.unref();
  return true;
}

export function displayServerInfo(): {
  waylandSession: boolean;
  nativeWayland: boolean;
} {
  return { waylandSession, nativeWayland };
}
