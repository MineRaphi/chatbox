import type { PickerApi } from '../../shared/ipc';

declare global {
  interface Window {
    chatbox: PickerApi;
  }
}
