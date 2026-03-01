<script lang="ts">
import type { PaletteEntry } from '$lib/types/palette';

let {
	entry,
	isSelected,
	onSelect,
}: {
	entry: PaletteEntry;
	isSelected: boolean;
	onSelect: () => void;
} = $props();

const typeAbbr: Record<string, string> = {
	exe: 'EXE',
	url: 'URL',
	folder: 'DIR',
	script: 'SCR',
	command: 'CMD',
};
</script>

<button
  type="button"
  class="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors {isSelected
    ? 'bg-accent text-accent-foreground'
    : 'hover:bg-muted'}"
  onclick={onSelect}
>
  {#if entry.kind === 'item'}
    <span class="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded">
      {#if entry.item.icon_path}
        <img src={entry.item.icon_path} alt={entry.item.label} class="h-6 w-6 object-contain" />
      {:else}
        <span class="text-xs font-bold text-muted-foreground">{typeAbbr[entry.item.item_type] ?? '?'}</span>
      {/if}
    </span>
    <span class="min-w-0 flex-1 truncate text-sm">{entry.item.label}</span>
    <span class="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground">
      {entry.item.item_type}
    </span>
  {:else if entry.kind === 'calc'}
    <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-amber-100 dark:bg-amber-900">
      <span class="text-xs font-bold text-amber-700 dark:text-amber-300">=</span>
    </span>
    <span class="min-w-0 flex-1 truncate text-sm font-mono">{entry.result}</span>
    <span class="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
      CALC
    </span>
  {:else}
    <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-sky-100 dark:bg-sky-900">
      <span class="text-xs font-bold text-sky-700 dark:text-sky-300">CB</span>
    </span>
    <span class="min-w-0 flex-1 truncate text-sm font-mono">{entry.text}</span>
    <span class="shrink-0 rounded bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900 dark:text-sky-300">
      CLIP
    </span>
  {/if}
</button>
