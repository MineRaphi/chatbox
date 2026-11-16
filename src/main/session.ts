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
// If the copy can't start or dies right away, this process carries on
// natively instead of leaving the user with nothing.

export const X11_FLAG = '--ozone-platform=x11';

let waylandSession = false;
let nativeWayland = false;

// How long the X11 copy has to stay alive before this process trusts it.
const X11_COPY_GRACE_MS = 2_000;

/**
 * On a Wayland session (unless native Wayland mode is on), make sure this
 * process runs on X11. Returns null when nothing has to happen. Otherwise
 * it has started an X11 copy of itself and returns a promise: true once
 * that copy is running (the caller must then exit), false if it couldn't
 * be started or died at once (the caller then starts up here, natively).
 * Call only while holding the single-instance lock (so a second launch,
 * e.g. from a window manager keybind, goes straight to the running Chatbox
 * instead of starting a copy first); the lock is handed over to the copy.
 * Call after the settings folder is final (dev profile), since it reads a
 * setting.
 */
export function relaunchOnX11IfNeeded(): Promise<boolean> | null {
  if (process.platform !== 'linux') return null;
  waylandSession =
    process.env.XDG_SESSION_TYPE === 'wayland' ||
    Boolean(process.env.WAYLAND_DISPLAY);
  if (!waylandSession) return null;

  // What this process actually runs on (the flag decides, not the setting).
  nativeWayland = !process.argv.includes(X11_FLAG);
  if (!nativeWayland || getSetting('linuxNativeWayland')) return null;

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

  return new Promise((resolve) => {
    const failed = (why: unknown): void => {
      clearTimeout(timer);
      console.error(
        '[session] the XWayland copy did not start; running natively on Wayland instead (emotes may not stay on top):',
        why,
      );
      resolve(false);
    };
    // Still alive after the grace period: it has taken over.
    const timer = setTimeout(() => {
      child.removeAllListeners();
      child.unref();
      resolve(true);
    }, X11_COPY_GRACE_MS);
    child.once('error', failed);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        clearTimeout(timer);
        resolve(true); // it finished by itself, e.g. the user quit it
      } else {
        failed(`exit code ${code ?? signal}`);
      }
    });
  });
}

export function displayServerInfo(): {
  waylandSession: boolean;
  nativeWayland: boolean;
} {
  return { waylandSession, nativeWayland };
}

/** Quit and start Chatbox again. */
export function restartApp(): void {
  // An AppImage must be relaunched through the AppImage file itself, not
  // the binary inside its temporary mount.
  const appImage = process.env.APPIMAGE;
  // Drop the X11 flag: the new copy decides again from the current
  // setting (and re-adds it if native Wayland mode is off).
  const args = process.argv.slice(1).filter((a) => a !== X11_FLAG);
  app.relaunch({ args, ...(appImage ? { execPath: appImage } : {}) });
  app.quit();
}
