<script lang="ts">
  import type { ConnectionStatus } from '../../shared/ipc';

  interface Props {
    status: ConnectionStatus | null;
    /** Your display name, to mark yourself in the list. */
    you: string;
    /** Bumped every time the window opens: it opens with the list closed. */
    shownCount: number;
  }
  const { status, you, shownCount }: Props = $props();

  let open = $state(false);
  let rootEl = $state<HTMLElement>();

  const connected = $derived(status?.state === 'connected');
  const groupName = $derived(status?.group ? status.group : 'default group');

  /** You first, then everyone else alphabetically. Names can repeat. */
  const people = $derived.by(() => {
    const names = connected ? [...(status?.members ?? [])] : [];
    const mine = names.indexOf(you);
    if (mine >= 0) names.splice(mine, 1);
    const others = names
      .toSorted((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map((name) => ({ name, isYou: false }));
    return mine >= 0 ? [{ name: you, isYou: true }, ...others] : others;
  });

  $effect(() => {
    void shownCount;
    open = false;
  });

  function onWindowClick(event: MouseEvent): void {
    if (open && rootEl && !rootEl.contains(event.target as Node)) open = false;
  }
</script>

<svelte:window onclick={onWindowClick} />

<div class="relative" bind:this={rootEl}>
  <button
    class="flex items-center gap-1 rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100
      {open ? 'bg-zinc-800 text-zinc-100' : ''}"
    onclick={() => (open = !open)}
    aria-label="Who's online"
    aria-expanded={open}
    title="Who's online"
  >
    <!-- Users from Heroicons (MIT), 20px solid set -->
    <svg viewBox="0 0 20 20" fill="currentColor" class="size-5" aria-hidden="true">
      <path
        d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z"
      />
    </svg>
    {#if connected}
      <span class="min-w-3 text-xs tabular-nums">{people.length}</span>
    {/if}
  </button>

  {#if open}
    <div
      class="absolute top-full right-0 z-10 mt-1 flex max-h-72 w-56 flex-col rounded-md border border-zinc-700 bg-zinc-800 text-sm shadow-lg"
      role="dialog"
      aria-label="Who's online"
    >
      {#if connected}
        <p class="truncate border-b border-zinc-700 px-3 py-2 text-xs text-zinc-400">
          {people.length} online in {groupName}
        </p>
        <ul class="min-h-0 overflow-y-auto py-1">
          {#each people as person, i (i)}
            <li class="flex items-center gap-2 px-3 py-1">
              <span class="size-1.5 shrink-0 rounded-full bg-emerald-400"></span>
              <span class="truncate">{person.name}</span>
              {#if person.isYou}
                <span class="shrink-0 text-xs text-zinc-500">(you)</span>
              {/if}
            </li>
          {/each}
        </ul>
      {:else}
        <p class="px-3 py-2 text-xs text-zinc-400">
          {status?.state === 'not-configured'
            ? 'No server set.'
            : 'Not connected. Once you are, the people in your group show up here.'}
        </p>
      {/if}
    </div>
  {/if}
</div>
