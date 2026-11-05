<script lang="ts">
  import type { ConnectionStatus, EmoteList } from '../../shared/ipc';
  import Picker from './Picker.svelte';
  import Settings from './Settings.svelte';

  let view = $state<'picker' | 'settings'>('picker');
  let status = $state<ConnectionStatus | null>(null);
  let list = $state<EmoteList | null>(null);
  // Bumped every time the window is shown, so the picker can refocus search.
  let shownCount = $state(0);

  // Callbacks passed to window.chatbox must not return a value: the context
  // bridge copies return values back, and Svelte state proxies can't be copied.
  void window.chatbox.getStatus().then((s) => {
    status = s;
  });
  window.chatbox.onStatus((s) => {
    status = s;
  });

  void window.chatbox.getEmotes().then((l) => {
    list = l;
  });
  window.chatbox.onEmotesChanged((l) => {
    list = l;
  });

  window.chatbox.onShown(() => {
    view = status?.state === 'not-configured' ? 'settings' : 'picker';
    shownCount++;
  });
</script>

<main class="flex h-full flex-col bg-zinc-900 text-zinc-100">
  {#if view === 'picker'}
    <Picker
      {list}
      {status}
      {shownCount}
      onOpenSettings={() => (view = 'settings')}
    />
  {:else}
    <Settings {status} onBack={() => (view = 'picker')} />
  {/if}
</main>
