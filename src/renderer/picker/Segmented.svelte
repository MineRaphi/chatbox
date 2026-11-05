<script lang="ts" generics="T extends string | number">
  interface Props {
    label: string;
    options: { value: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
  }
  const { label, options, value, onChange }: Props = $props();
</script>

<div class="flex flex-col gap-1">
  <span class="text-sm">{label}</span>
  <div class="flex rounded-md bg-zinc-800 p-0.5" role="radiogroup" aria-label={label}>
    {#each options as option (option.value)}
      <button
        type="button"
        role="radio"
        aria-checked={option.value === value}
        class="flex-1 rounded px-2 py-1 text-xs transition-colors
          {option.value === value
          ? 'bg-zinc-600 text-zinc-50'
          : 'text-zinc-400 hover:text-zinc-100'}"
        onclick={() => onChange(option.value)}
      >
        {option.label}
      </button>
    {/each}
  </div>
</div>
