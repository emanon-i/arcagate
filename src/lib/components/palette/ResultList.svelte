<script lang="ts">
import type { PaletteEntry } from '$lib/types/palette';
import { entryKey } from '$lib/types/palette';
import ResultItem from './ResultItem.svelte';

let {
	items,
	selectedIndex,
	onSelect,
}: {
	items: PaletteEntry[];
	selectedIndex: number;
	onSelect: (entry: PaletteEntry) => void;
} = $props();

const displayItems = $derived(items.slice(0, 100));
</script>

{#if displayItems.length > 0}
  <div class="max-h-80 overflow-y-auto border-t">
    {#each displayItems as entry, i (entryKey(entry))}
      <ResultItem {entry} isSelected={i === selectedIndex} onSelect={() => onSelect(entry)} />
    {/each}
  </div>
{/if}
