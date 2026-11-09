<script lang="ts">
  import type { ConnectionStatus } from '../../shared/ipc';

  const { status }: { status: ConnectionStatus | null } = $props();

  const groupName = $derived(status?.group ? status.group : 'default group');

  const text = $derived.by(() => {
    if (!status) return '';
    switch (status.state) {
      case 'not-configured':
        return 'No server set';
      case 'connecting':
        return `Connecting to ${status.address}…`;
      case 'connected':
        return `${groupName} · ${status.members.length} online`;
      case 'reconnecting':
        return `Reconnecting to ${status.address}…`;
      case 'rejected':
        return "Couldn't join the server";
    }
  });

  // Hovering shows where you are and who's there.
  const title = $derived(
    status?.state === 'connected'
      ? `${status.address} · ${groupName}\n${status.members.join(', ')}`
      : (status?.address ?? ''),
  );

  const color = $derived(
    status?.state === 'connected'
      ? 'bg-emerald-400'
      : status?.state === 'rejected'
        ? 'bg-red-400'
        : status?.state === 'not-configured'
          ? 'bg-zinc-500'
          : 'bg-amber-400',
  );
</script>

<span class="size-2 shrink-0 rounded-full {color}"></span>
<span class="truncate" {title}>{text}</span>
