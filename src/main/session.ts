import { app } from 'electron';
import { getSetting } from './store';

// On a Wayland desktop, apps can't keep their windows on top or put them on
// every virtual desktop; only the compositor decides that. Electron runs
// natively on Wayland by default, so the emote overlays would sink behind
// other windows and stay on one desktop. Through XWayland (X11 on Wayland)
// both hints work. The trade-off: global shortcuts may only work while a
// Chatbox window is focused, so native Wayland stays available as a setting.

let waylandSession = false;
let nativeWayland = false;

/**
 * Pick X11 (XWayland) or native Wayland. Must run before the app is ready,
 * and after the settings folder is final (dev profile), since it reads a
 * setting.
 */
export function configureDisplayServer(): void {
  if (process.platform !== 'linux') return;
  waylandSession =
    process.env.XDG_SESSION_TYPE === 'wayland' ||
    Boolean(process.env.WAYLAND_DISPLAY);
  if (!waylandSession) return;

  nativeWayland = getSetting('linuxNativeWayland');
  app.commandLine.appendSwitch(
    'ozone-platform',
    nativeWayland ? 'wayland' : 'x11',
  );
}

export function displayServerInfo(): {
  waylandSession: boolean;
  nativeWayland: boolean;
} {
  return { waylandSession, nativeWayland };
}
