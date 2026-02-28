<script lang="ts">
import type { Item } from '$lib/types/item';
import ResultItem from './ResultItem.svelte';

let {
	items,
	selectedIndex,
	onSelect,
}: {
	items: Item[];
	selectedIndex: number;
	onSelect: (item: Item) => void;
} = $props();

const displayItems = $derived(items.slice(0, 100));
</script>

{#if displayItems.length > 0}
  <div class="max-h-80 overflow-y-auto border-t">
    {#each displayItems as item, i (item.id)}
      <ResultItem {item} isSelected={i === selectedIndex} onSelect={() => onSelect(item)} />
    {/each}
  </div>
{/if}
