<script lang="ts">
  import type { ConnectionStatus } from '../../shared/ipc';

  // Temporary screen until the real picker (milestone 4) and settings
  // (milestone 5) exist: just enough to point the app at a server.

  let host = $state('');
  let port = $state('3847');
  let status = $state<ConnectionStatus | null>(null);
  let saveError = $state('');

  const statusText = $derived.by(() => {
    if (!status) return '';
    switch (status.state) {
      case 'not-configured':
        return 'No server set';
      case 'connecting':
        return `Connecting to ${status.address}…`;
      case 'connected':
        return `Connected to ${status.address}`;
      case 'reconnecting':
        return `Reconnecting to ${status.address}…`;
    }
  });

  const dotClass = $derived(
    status?.state === 'connected'
      ? 'bg-emerald-400'
      : status?.state === 'not-configured'
        ? 'bg-zinc-500'
        : 'bg-amber-400',
  );

  void window.chatbox.getSettings().then((s) => {
    host = s.serverHost;
    port = String(s.serverPort);
  });
  void window.chatbox.getStatus().then((s) => (status = s));
  window.chatbox.onStatus((s) => (status = s));

  async function save(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    saveError = '';
    const portNumber = Number(port);
    const okPort = await window.chatbox.setSetting('serverPort', portNumber);
    const okHost = okPort && (await window.chatbox.setSetting('serverHost', host));
    if (!okPort) saveError = 'Port must be a number from 1 to 65535.';
    else if (!okHost) saveError = 'Host can only contain letters, digits, dots and dashes.';
  }
</script>

<main class="flex h-full flex-col gap-5 bg-zinc-900 p-6 text-zinc-100">
  <header>
    <h1 class="text-lg font-semibold">Chatbox</h1>
    <p class="text-sm text-zinc-400">The emote picker arrives in milestone 4.</p>
  </header>

  <form class="flex flex-col gap-3" onsubmit={save}>
    <label class="flex flex-col gap-1 text-sm">
      <span class="text-zinc-400">Server</span>
      <input
        class="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 outline-none focus:border-zinc-400"
        placeholder="192.168.0.10"
        bind:value={host}
        autocomplete="off"
        spellcheck="false"
      />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      <span class="text-zinc-400">Port</span>
      <input
        class="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 outline-none focus:border-zinc-400"
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

  <footer class="mt-auto flex items-center gap-2 text-xs text-zinc-400">
    <span class="size-2 rounded-full {dotClass}"></span>
    <span>{statusText}</span>
  </footer>
  {#if status?.state === 'reconnecting' && status.error}
    <p class="-mt-3 text-xs text-zinc-500">{status.error}</p>
  {/if}
</main>
