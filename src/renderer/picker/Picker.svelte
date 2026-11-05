<script lang="ts">
  import { tick } from 'svelte';
  import {
    emoteUrl,
    type ConnectionStatus,
    type Emote,
    type EmoteList,
  } from '../../shared/ipc';
  import StatusDot from './StatusDot.svelte';

  interface Props {
    list: EmoteList | null;
    status: ConnectionStatus | null;
    shownCount: number;
    onOpenSettings: () => void;
  }
  const { list, status, shownCount, onOpenSettings }: Props = $props();

  const COLS = 6;
  const FLASH_MS = 400;

  let query = $state('');
  let selected = $state(0);
  let flashId = $state<string | null>(null);
  let searchEl = $state<HTMLInputElement>();
  let gridEl = $state<HTMLElement>();

  /** Exact match first, then names starting with the query, then the rest. */
  const results = $derived.by((): Emote[] => {
    const emotes = list?.emotes ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return emotes;
    const rank = (name: string): number => {
      const n = name.toLowerCase();
      if (n === q) return 0;
      if (n.startsWith(q)) return 1;
      return n.includes(q) ? 2 : -1;
    };
    return emotes
      .map((emote) => ({ emote, r: rank(emote.name) }))
      .filter((x) => x.r >= 0)
      .toSorted((a, b) => a.r - b.r)
      .map((x) => x.emote);
  });

  const current = $derived(results[selected]);

  // A new search starts at the best match.
  $effect(() => {
    void query;
    selected = 0;
  });

  // Every time the window opens: focus search, select its text.
  $effect(() => {
    void shownCount;
    selected = 0;
    void tick().then(() => searchEl?.select());
  });

  async function send(emote: Emote): Promise<void> {
    flashId = emote.id;
    setTimeout(() => {
      if (flashId === emote.id) flashId = null;
    }, FLASH_MS);
    await window.chatbox.sendEmote(emote.id);
  }

  async function move(delta: number): Promise<void> {
    if (!results.length) return;
    selected = Math.min(results.length - 1, Math.max(0, selected + delta));
    await tick();
    gridEl
      ?.querySelector<HTMLElement>(`[data-index="${selected}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }

  function onKeydown(event: KeyboardEvent): void {
    const keys: Record<string, () => void> = {
      ArrowRight: () => void move(1),
      ArrowLeft: () => void move(-1),
      ArrowDown: () => void move(COLS),
      ArrowUp: () => void move(-COLS),
      Enter: () => {
        if (current) void send(current);
      },
    };
    const action = keys[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<header class="flex items-center gap-2 border-b border-zinc-800 p-3">
  <input
    bind:this={searchEl}
    bind:value={query}
    class="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:border-zinc-500"
    placeholder="Search emotes"
    autocomplete="off"
    spellcheck="false"
    aria-label="Search emotes"
  />
  <button
    class="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
    onclick={onOpenSettings}
    aria-label="Settings"
    title="Settings"
  >
    <!-- Cog from Heroicons (MIT), 20px solid set -->
    <svg viewBox="0 0 20 20" fill="currentColor" class="size-5" aria-hidden="true">
      <path
        fill-rule="evenodd"
        d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        clip-rule="evenodd"
      />
    </svg>
  </button>
</header>

<section class="min-h-0 flex-1 overflow-y-auto p-3" bind:this={gridEl}>
  {#if !list || (list.loading && !list.emotes.length)}
    <p class="mt-16 text-center text-sm text-zinc-500">Loading emotes…</p>
  {:else if list.error && !list.emotes.length}
    <div class="mt-16 flex flex-col items-center gap-3 text-center text-sm">
      <p class="text-zinc-400">{list.error}</p>
      <button
        class="rounded-md bg-zinc-800 px-3 py-1.5 hover:bg-zinc-700"
        onclick={() => window.chatbox.refreshEmotes()}
      >
        Try again
      </button>
    </div>
  {:else if !results.length}
    <p class="mt-16 text-center text-sm text-zinc-500">
      No emotes match “{query.trim()}”
    </p>
  {:else}
    <div class="grid grid-cols-6 gap-1" role="listbox" aria-label="Emotes">
      {#each results as emote, i (emote.id)}
        <button
          data-index={i}
          role="option"
          aria-selected={i === selected}
          title={emote.name}
          class="flex aspect-square items-center justify-center rounded-md transition-colors
            {i === selected ? 'bg-zinc-700' : 'hover:bg-zinc-800'}
            {flashId === emote.id ? 'ring-2 ring-emerald-400' : ''}"
          onclick={() => send(emote)}
          onmouseenter={() => (selected = i)}
        >
          <img
            src={emoteUrl(emote.id, 2)}
            alt={emote.name}
            class="max-h-9 max-w-9 object-contain"
            loading="lazy"
            draggable="false"
          />
        </button>
      {/each}
    </div>
  {/if}
</section>

<footer
  class="flex items-center justify-between gap-3 border-t border-zinc-800 px-3 py-2 text-xs text-zinc-400"
>
  <button
    class="flex min-w-0 items-center gap-2 hover:text-zinc-200"
    onclick={onOpenSettings}
    title="Server settings"
  >
    <StatusDot {status} />
  </button>
  <span class="truncate text-zinc-300">{current?.name ?? ''}</span>
</footer>
