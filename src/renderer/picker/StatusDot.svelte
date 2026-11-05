<script lang="ts">
  import type { ConnectionStatus } from '../../shared/ipc';

  const { status }: { status: ConnectionStatus | null } = $props();

  const text = $derived.by(() => {
    if (!status) return '';
    switch (status.state) {
      case 'not-configured':
        return 'No server set';
      case 'connecting':
        return `Connecting to ${status.address}…`;
      case 'connected':
        return status.address ?? '';
      case 'reconnecting':
        return `Reconnecting to ${status.address}…`;
    }
  });

  const color = $derived(
    status?.state === 'connected'
      ? 'bg-emerald-400'
      : status?.state === 'not-configured'
        ? 'bg-zinc-500'
        : 'bg-amber-400',
  );
</script>

<span class="size-2 shrink-0 rounded-full {color}"></span>
<span class="truncate">{text}</span>
