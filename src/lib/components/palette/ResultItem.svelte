<script lang="ts">
import type { Item } from '$lib/types/item';

let {
	item,
	isSelected,
	onSelect,
}: {
	item: Item;
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
  <span class="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded">
    {#if item.icon_path}
      <img src={item.icon_path} alt={item.label} class="h-6 w-6 object-contain" />
    {:else}
      <span class="text-xs font-bold text-muted-foreground">{typeAbbr[item.item_type] ?? "?"}</span>
    {/if}
  </span>
  <span class="min-w-0 flex-1 truncate text-sm">{item.label}</span>
  <span class="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground">
    {item.item_type}
  </span>
</button>
