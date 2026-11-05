<script lang="ts">
  import type {
    ConnectionStatus,
    EmoteList,
    PickerView,
    Settings as SettingsData,
  } from '../../shared/ipc';
  import Picker from './Picker.svelte';
  import Settings from './Settings.svelte';

  let view = $state<PickerView>('picker');
  let status = $state<ConnectionStatus | null>(null);
  let list = $state<EmoteList | null>(null);
  let settings = $state<SettingsData | null>(null);
  let platform = $state<NodeJS.Platform>('darwin');
  // Bumped every time the window is shown, so views can refocus.
  let shownCount = $state(0);

  // Callbacks passed to window.chatbox must not return a value: the context
  // bridge copies return values back, and Svelte state proxies can't be copied.
  void window.chatbox.getAppInfo().then((info) => {
    platform = info.platform;
  });
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
  void window.chatbox.getSettings().then((s) => {
    settings = s;
  });
  window.chatbox.onSettingsChanged((s) => {
    settings = s;
  });

  window.chatbox.onShown((requested) => {
    // Without a server there's nothing to send to: start in setup.
    view = status?.state === 'not-configured' ? 'settings' : requested;
    shownCount++;
  });
</script>

<main class="flex h-full flex-col bg-zinc-900 text-zinc-100">
  {#if view === 'picker'}
    <Picker
      {list}
      {status}
      favorites={settings?.favorites ?? []}
      {shownCount}
      onOpenSettings={() => (view = 'settings')}
    />
  {:else if settings}
    <Settings
      {settings}
      {status}
      setNames={list?.setNames ?? {}}
      {platform}
      {shownCount}
      onBack={() => (view = 'picker')}
    />
  {/if}
</main>
