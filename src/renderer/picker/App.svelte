<script lang="ts">
  const info = window.chatbox.getAppInfo();
</script>

<main
  class="flex h-full flex-col items-center justify-center gap-2 bg-zinc-900 text-zinc-100"
>
  <h1 class="text-lg font-semibold">Chatbox</h1>
  <p class="text-sm text-zinc-400">The emote picker arrives in milestone 4.</p>
  {#await info then { version, platform }}
    <p class="text-xs text-zinc-500">v{version} · {platform}</p>
  {/await}
</main>
