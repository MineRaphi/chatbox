<script lang="ts">
  interface Props {
    label: string;
    hint?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  }
  const { label, hint, checked, onChange }: Props = $props();
</script>

<!-- `relative` keeps the visually hidden checkbox inside this label; without
     it, focusing the checkbox scrolled the whole window out of view. -->
<label class="relative flex cursor-pointer items-start justify-between gap-3 py-1">
  <span class="flex flex-col">
    <span class="text-sm">{label}</span>
    {#if hint}<span class="text-xs text-zinc-500">{hint}</span>{/if}
  </span>
  <input
    type="checkbox"
    role="switch"
    class="peer sr-only"
    {checked}
    onchange={(e) => onChange(e.currentTarget.checked)}
  />
  <span
    class="relative mt-0.5 h-5 w-9 shrink-0 rounded-full bg-zinc-700 transition-colors
      peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-400
      after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white
      after:transition-transform peer-checked:after:translate-x-4"
    aria-hidden="true"
  ></span>
</label>
