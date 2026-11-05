<script lang="ts">
  import type { ConnectionStatus } from '../../shared/ipc';
  import StatusDot from './StatusDot.svelte';

  // Server settings only for now; the full settings view is milestone 5.

  interface Props {
    status: ConnectionStatus | null;
    onBack: () => void;
  }
  const { status, onBack }: Props = $props();

  let host = $state('');
  let port = $state('3847');
  let saveError = $state('');

  void window.chatbox.getSettings().then((s) => {
    host = s.serverHost;
    port = String(s.serverPort);
  });

  async function save(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    saveError = '';
    const okPort = await window.chatbox.setSetting('serverPort', Number(port));
    if (!okPort) {
      saveError = 'Port must be a number from 1 to 65535.';
      return;
    }
    const okHost = await window.chatbox.setSetting('serverHost', host);
    if (!okHost) {
      saveError = 'Server can only contain letters, digits, dots and dashes.';
      return;
    }
    if (host.trim()) onBack();
  }
</script>

<header class="flex items-center gap-2 border-b border-zinc-800 p-3">
  <button
    class="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
    onclick={onBack}
    aria-label="Back to emotes"
    title="Back"
  >
    <svg viewBox="0 0 20 20" fill="currentColor" class="size-5" aria-hidden="true">
      <path
        fill-rule="evenodd"
        d="M12.8 4.2a1 1 0 0 1 0 1.4L8.4 10l4.4 4.4a1 1 0 0 1-1.4 1.4l-5.1-5.1a1 1 0 0 1 0-1.4l5.1-5.1a1 1 0 0 1 1.4 0Z"
        clip-rule="evenodd"
      />
    </svg>
  </button>
  <h1 class="text-sm font-semibold">Settings</h1>
</header>

<form class="flex flex-1 flex-col gap-3 p-4" onsubmit={save}>
  <label class="flex flex-col gap-1 text-sm">
    <span class="text-zinc-400">Server</span>
    <input
      class="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 outline-none placeholder:text-zinc-500 focus:border-zinc-500"
      placeholder="192.168.0.10"
      bind:value={host}
      autocomplete="off"
      spellcheck="false"
    />
  </label>
  <label class="flex flex-col gap-1 text-sm">
    <span class="text-zinc-400">Port</span>
    <input
      class="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 outline-none focus:border-zinc-500"
      inputmode="numeric"
      bind:value={port}
    />
  </label>
  <button
    class="mt-1 rounded-md bg-zinc-100 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
  >
    Save and connect
  </button>
  {#if saveError}
    <p class="text-sm text-red-400">{saveError}</p>
  {/if}
</form>

<footer class="flex items-center gap-2 border-t border-zinc-800 px-3 py-2 text-xs text-zinc-400">
  <StatusDot {status} />
</footer>
{#if status?.state === 'reconnecting' && status.error}
  <p class="px-3 pb-2 text-xs text-zinc-500">{status.error}</p>
{/if}
