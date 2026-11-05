<script lang="ts">
  import { tick, untrack } from 'svelte';
  import type {
    ConnectionStatus,
    MonitorTarget,
    SettingKey,
    Settings,
  } from '../../shared/ipc';
  import HotkeyRecorder from './HotkeyRecorder.svelte';
  import Segmented from './Segmented.svelte';
  import StatusDot from './StatusDot.svelte';
  import Toggle from './Toggle.svelte';

  interface Props {
    settings: Settings;
    status: ConnectionStatus | null;
    /** Display names of cached sets, by ID. */
    setNames: Record<string, string>;
    platform: NodeJS.Platform;
    shownCount: number;
    onBack: () => void;
  }
  const { settings, status, setNames, platform, shownCount, onBack }: Props =
    $props();

  const SIZES = [
    { value: 200, label: 'S' },
    { value: 300, label: 'M' },
    { value: 450, label: 'L' },
  ];
  const MONITORS: { value: MonitorTarget; label: string }[] = [
    { value: 'primary', label: 'Main screen' },
    { value: 'cursor', label: 'Under cursor' },
    { value: 'all', label: 'All screens' },
  ];

  // Server fields are edited locally and only applied on "Save and connect",
  // because saving reconnects. Everything else saves on change.
  let host = $state('');
  let port = $state('');
  let serverError = $state('');
  let newSet = $state('');
  let setError = $state('');
  let setNotice = $state('');
  let addingSet = $state(false);
  let hostEl = $state<HTMLInputElement>();
  // Follows the slider while dragging; saved once it's let go.
  let durationMs = $state(0);
  $effect(() => {
    durationMs = settings.overlayDurationMs;
  });

  const firstRun = $derived(status?.state === 'not-configured');

  // socket.io reports transport-level reasons; turn them into advice.
  const connectionProblem = $derived.by((): string | null => {
    if (status?.state !== 'reconnecting' || !status.error) return null;
    const reason = status.error;
    if (/timeout/i.test(reason)) {
      return `No answer from ${status.address}. Check the address and that the server is running.`;
    }
    if (/websocket|xhr|transport|refused/i.test(reason)) {
      return `Can't reach ${status.address}. Is the server running, and is the address right?`;
    }
    if (reason === 'io server disconnect') {
      return 'The server closed the connection. Reconnecting…';
    }
    return `Lost the connection to ${status.address}. Reconnecting…`;
  });

  // Reset the server form and focus it every time the view opens.
  // Only `shownCount` triggers this; other setting changes must not wipe a
  // half-typed address.
  $effect(() => {
    void shownCount;
    untrack(() => {
      host = settings.serverHost;
      port = String(settings.serverPort);
      serverError = '';
      if (firstRun) void tick().then(() => hostEl?.focus());
    });
  });

  function save<K extends SettingKey>(key: K, value: Settings[K]): void {
    void window.chatbox.setSetting(key, value);
  }

  async function saveServer(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    serverError = '';
    if (!(await window.chatbox.setSetting('serverPort', Number(port)))) {
      serverError = 'Port must be a number from 1 to 65535.';
      return;
    }
    if (!(await window.chatbox.setSetting('serverHost', host))) {
      serverError = 'Server can only contain letters, digits, dots and dashes.';
      return;
    }
    if (host.trim()) onBack();
  }

  // Main looks the set up on 7TV first: it accepts old and new link formats,
  // returns the current ID, and rejects sets that don't exist.
  async function addSet(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (addingSet) return;
    setError = '';
    setNotice = '';
    addingSet = true;
    try {
      const result = await window.chatbox.resolveEmoteSet(newSet);
      if (!result.ok) {
        setError = result.error;
        return;
      }
      if (settings.emoteSets.includes(result.id)) {
        setError = `${result.name} is already added.`;
        return;
      }
      save('emoteSets', [...settings.emoteSets, result.id]);
      setNotice = `Added ${result.name} (${result.count} emotes).`;
      newSet = '';
    } finally {
      addingSet = false;
    }
  }

  function setLabel(id: string): string {
    if (id === 'global') return '7TV global';
    return setNames[id] ?? id;
  }

  function removeSet(id: string): void {
    save(
      'emoteSets',
      settings.emoteSets.filter((s) => s !== id),
    );
  }
</script>

<header class="flex items-center gap-2 border-b border-zinc-800 p-3">
  {#if !firstRun}
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
  {/if}
  <h1 class="px-1 text-sm font-semibold">
    {firstRun ? 'Welcome to Chatbox' : 'Settings'}
  </h1>
</header>

<div class="min-h-0 flex-1 overflow-y-auto">
  {#if firstRun}
    <p class="px-4 pt-4 text-sm text-zinc-400">
      Enter your group's server to start sending emotes.
    </p>
  {/if}

  <!-- Server -->
  <form class="flex flex-col gap-3 border-b border-zinc-800 p-4" onsubmit={saveServer}>
    <h2 class="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Server</h2>
    <div class="flex gap-2">
      <label class="flex min-w-0 flex-1 flex-col gap-1 text-sm">
        <span class="text-zinc-400">Address</span>
        <input
          bind:this={hostEl}
          bind:value={host}
          class="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 outline-none placeholder:text-zinc-500 focus:border-zinc-500"
          placeholder="192.168.0.10"
          autocomplete="off"
          spellcheck="false"
        />
      </label>
      <label class="flex w-20 flex-col gap-1 text-sm">
        <span class="text-zinc-400">Port</span>
        <input
          bind:value={port}
          class="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 outline-none focus:border-zinc-500"
          inputmode="numeric"
        />
      </label>
    </div>
    <button
      class="rounded-md bg-zinc-100 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
    >
      Save and connect
    </button>
    {#if serverError}
      <p class="text-sm text-red-400">{serverError}</p>
    {:else if connectionProblem}
      <div class="flex flex-col gap-0.5" role="status">
        <p class="text-sm text-amber-300">{connectionProblem}</p>
        <p class="text-xs text-zinc-500">Details: {status?.error}</p>
      </div>
    {/if}
  </form>

  <!-- You -->
  <section class="flex flex-col gap-3 border-b border-zinc-800 p-4">
    <h2 class="text-xs font-semibold tracking-wide text-zinc-500 uppercase">You</h2>
    <label class="flex flex-col gap-1 text-sm">
      <span class="text-zinc-400">Display name</span>
      <input
        value={settings.displayName}
        maxlength="32"
        class="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 outline-none focus:border-zinc-500"
        onchange={(e) => save('displayName', e.currentTarget.value)}
      />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      <span class="text-zinc-400">Group code</span>
      <input
        value={settings.groupCode}
        maxlength="64"
        class="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 outline-none focus:border-zinc-500"
        autocomplete="off"
        spellcheck="false"
        onchange={(e) => save('groupCode', e.currentTarget.value)}
      />
    </label>
    <p class="text-xs text-zinc-500">
      Saved now; used once the server supports groups. Until then everyone on the
      server is one group.
    </p>
  </section>

  {#if !firstRun}
    <!-- Picker -->
    <section class="flex flex-col gap-3 border-b border-zinc-800 p-4">
      <h2 class="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
        Shortcut
      </h2>
      <HotkeyRecorder hotkey={settings.hotkey} {platform} />
    </section>

    <!-- Overlay -->
    <section class="flex flex-col gap-3 border-b border-zinc-800 p-4">
      <h2 class="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
        Overlay
      </h2>
      <Segmented
        label="Emote size"
        options={SIZES}
        value={settings.overlaySizePx}
        onChange={(v) => save('overlaySizePx', v)}
      />
      <label class="flex flex-col gap-1">
        <span class="flex justify-between text-sm">
          <span>Duration</span>
<span class="text-zinc-400">{(durationMs / 1000).toFixed(1)} s</span>
        </span>
        <input
          type="range"
          min="1000"
          max="10000"
          step="500"
          value={durationMs}
          class="accent-emerald-500"
          oninput={(e) => (durationMs = Number(e.currentTarget.value))}
          onchange={() => save('overlayDurationMs', durationMs)}
        />
      </label>
      <Segmented
        label="Show on"
        options={MONITORS}
        value={settings.overlayMonitor}
        onChange={(v) => save('overlayMonitor', v)}
      />
      <Toggle
        label="Max 5 on screen"
        hint="A new emote replaces the oldest one."
        checked={settings.limitOnScreen}
        onChange={(v) => save('limitOnScreen', v)}
      />
      <Toggle
        label="Max 10 incoming per 10 s"
        hint="Extra emotes from others are dropped."
        checked={settings.limitRate}
        onChange={(v) => save('limitRate', v)}
      />
    </section>

    <!-- Emote sets -->
    <section class="flex flex-col gap-2 border-b border-zinc-800 p-4">
      <h2 class="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
        Emote sets
      </h2>
      <ul class="flex flex-col gap-1">
        {#each settings.emoteSets as id (id)}
          <li class="flex items-center justify-between gap-2 rounded-md bg-zinc-800 px-3 py-1.5 text-sm">
            <span
              class="truncate text-xs {setLabel(id) === id ? 'font-mono' : ''}"
              title={id}
            >
              {setLabel(id)}
            </span>
            <button
              class="text-xs text-zinc-400 hover:text-red-400 disabled:opacity-30"
              disabled={settings.emoteSets.length === 1}
              title={settings.emoteSets.length === 1 ? 'Keep at least one set' : 'Remove'}
              onclick={() => removeSet(id)}
            >
              Remove
            </button>
          </li>
        {/each}
      </ul>
      <form class="flex gap-2" onsubmit={addSet}>
        <input
          bind:value={newSet}
          class="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm outline-none placeholder:text-zinc-500 focus:border-zinc-500"
          placeholder="7tv.app/emote-sets/… or ID"
          autocomplete="off"
          spellcheck="false"
        />
        <button
          class="rounded-md bg-zinc-800 px-3 text-sm hover:bg-zinc-700 disabled:opacity-50"
          disabled={addingSet}
        >
          {addingSet ? 'Adding…' : 'Add'}
        </button>
      </form>
      {#if setError}
        <p class="text-xs text-red-400">{setError}</p>
      {:else if setNotice}
        <p class="text-xs text-emerald-400">{setNotice}</p>
      {/if}
    </section>

    <!-- General -->
    <section class="flex flex-col gap-2 p-4">
      <h2 class="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
        General
      </h2>
      <Toggle
        label="Do not disturb"
        hint="Hide emotes from others. Yours still show."
        checked={settings.doNotDisturb}
        onChange={(v) => save('doNotDisturb', v)}
      />
      <Toggle
        label="Launch at login"
        checked={settings.launchAtLogin}
        onChange={(v) => save('launchAtLogin', v)}
      />
    </section>
  {/if}
</div>

<footer class="flex items-center gap-2 border-t border-zinc-800 px-3 py-2 text-xs text-zinc-400">
  <StatusDot {status} />
</footer>
