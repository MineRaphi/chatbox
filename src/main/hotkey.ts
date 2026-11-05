import { EventEmitter } from 'node:events';
import { BrowserWindow, globalShortcut } from 'electron';
import { IpcChannel } from '../shared/ipc';
import { togglePicker } from './picker';
import { getSetting, onSettingChange } from './store';

let registered: string | null = null;
let recording = false;
const events = new EventEmitter<{ change: [hotkey: string | null] }>();

function publish(): void {
  events.emit('change', registered);
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IpcChannel.HotkeyChanged, registered);
  }
}

function unregister(): void {
  if (registered) globalShortcut.unregister(registered);
  registered = null;
}

function register(accelerator: string): void {
  unregister();
  try {
    if (globalShortcut.register(accelerator, togglePicker)) {
      registered = accelerator;
    } else {
      // Usually another app already owns this shortcut.
      console.warn(`[hotkey] ${accelerator} is taken by another app`);
    }
  } catch (err) {
    console.warn(`[hotkey] invalid accelerator ${accelerator}:`, err);
  }
  publish();
}

export function initHotkey(): void {
  register(getSetting('hotkey'));
  onSettingChange((key, settings) => {
    if (key === 'hotkey' && !recording) register(settings.hotkey);
  });
}

/**
 * While the user records a new shortcut, the current one must not fire
 * (pressing it would close the picker mid-recording).
 */
export function setRecording(on: boolean): void {
  if (on === recording) return;
  recording = on;
  if (on) {
    unregister();
  } else {
    register(getSetting('hotkey'));
  }
}

/** The accelerator that is actually registered, or null if none. */
export function getHotkey(): string | null {
  return registered;
}

export function onHotkeyChange(
  listener: (hotkey: string | null) => void,
): void {
  events.on('change', listener);
}
