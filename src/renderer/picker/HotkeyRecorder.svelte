<script lang="ts">
  interface Props {
    hotkey: string;
    platform: NodeJS.Platform;
  }
  const { hotkey, platform }: Props = $props();

  const mac = $derived(platform === 'darwin');
  let recording = $state(false);
  let registered = $state<string | null>(null);
  let message = $state('');

  void window.chatbox.getHotkey().then((h) => {
    registered = h;
  });
  window.chatbox.onHotkeyChanged((h) => {
    registered = h;
  });

  /** `CommandOrControl+Shift+E` → `⌘⇧E` on macOS, `Ctrl+Shift+E` elsewhere. */
  function pretty(accelerator: string): string {
    const names: Record<string, [mac: string, other: string]> = {
      CommandOrControl: ['⌘', 'Ctrl'],
      Command: ['⌘', 'Win'],
      Control: ['⌃', 'Ctrl'],
      Alt: ['⌥', 'Alt'],
      Shift: ['⇧', 'Shift'],
    };
    const parts = accelerator
      .split('+')
      .map((p) => names[p]?.[mac ? 0 : 1] ?? p);
    return parts.join(mac ? '' : '+');
  }

  // KeyboardEvent.code → Electron accelerator key name.
  function keyName(code: string): string | null {
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit[0-9]$/.test(code)) return code.slice(5);
    if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) return code;
    const named: Record<string, string> = {
      Space: 'Space',
      ArrowUp: 'Up',
      ArrowDown: 'Down',
      ArrowLeft: 'Left',
      ArrowRight: 'Right',
      Backquote: 'Backquote',
    };
    return named[code] ?? null;
  }

  async function start(): Promise<void> {
    message = '';
    recording = true;
    await window.chatbox.setHotkeyRecording(true);
  }

  async function stop(): Promise<void> {
    if (!recording) return;
    recording = false;
    await window.chatbox.setHotkeyRecording(false);
  }

  async function onKeydown(event: KeyboardEvent): Promise<void> {
    if (!recording) return;
    event.preventDefault();
    event.stopPropagation();

    const key = keyName(event.code);
    if (!key) return; // a modifier on its own, or an unsupported key

    const modifiers = [
      event.metaKey && (mac ? 'Command' : 'Super'),
      event.ctrlKey && 'Control',
      event.altKey && 'Alt',
      event.shiftKey && 'Shift',
    ].filter((m): m is string => Boolean(m));
    if (!modifiers.length && !/^F\d+$/.test(key)) {
      message = 'Add a modifier like ' + (mac ? '⌘ or ⌥' : 'Ctrl or Alt') + '.';
      return;
    }

    const accelerator = [...modifiers, key].join('+');
    const saved = await window.chatbox.setSetting('hotkey', accelerator);
    await stop();
    if (!saved) message = "That shortcut can't be used.";
  }

  const failed = $derived(!recording && registered === null);
</script>

<div class="flex flex-col gap-1">
  <span class="text-sm">Open picker</span>
  <button
    type="button"
    class="rounded-md border px-3 py-2 text-left text-sm transition-colors
      {recording
      ? 'border-emerald-500 bg-zinc-800 text-zinc-300'
      : 'border-zinc-700 bg-zinc-800 hover:border-zinc-500'}"
    onclick={() => (recording ? stop() : start())}
    onkeydown={onKeydown}
    onblur={stop}
  >
    {recording ? 'Press the new shortcut…' : pretty(hotkey)}
  </button>
  {#if message}
    <span class="text-xs text-amber-400">{message}</span>
  {:else if failed}
    <span class="text-xs text-amber-400">
      Couldn't register this shortcut. Another app may be using it.
    </span>
  {:else}
    <span class="text-xs text-zinc-500">Click, then press a key combination.</span>
  {/if}
</div>
