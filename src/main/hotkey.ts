import { EventEmitter } from 'node:events';
import { globalShortcut } from 'electron';
import { togglePicker } from './picker';
import { getSetting, onSettingChange } from './store';

let registered: string | null = null;
const events = new EventEmitter<{ change: [hotkey: string | null] }>();

function register(accelerator: string): void {
  if (registered) globalShortcut.unregister(registered);
  registered = null;

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
  events.emit('change', registered);
}

export function initHotkey(): void {
  register(getSetting('hotkey'));
  onSettingChange((key, settings) => {
    if (key === 'hotkey') register(settings.hotkey);
  });
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
