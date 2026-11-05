<script lang="ts">
  import { emoteUrl, type Emote } from '../../shared/ipc';

  interface Props {
    emote: Emote;
    /** Tailwind size classes for the image, e.g. `max-h-9 max-w-9`. */
    size: string;
    lazy?: boolean;
  }
  const { emote, size, lazy = false }: Props = $props();

  // Offline or a CDN hiccup: show the name instead of a broken image.
  let failed = $state(false);
</script>

{#if failed}
  <span
    class="line-clamp-2 px-0.5 text-center text-[10px] leading-tight break-all text-zinc-400"
  >
    {emote.name}
  </span>
{:else}
  <img
    src={emoteUrl(emote.id, 2)}
    alt={emote.name}
    class="{size} object-contain"
    loading={lazy ? 'lazy' : 'eager'}
    draggable="false"
    onerror={() => (failed = true)}
  />
{/if}
