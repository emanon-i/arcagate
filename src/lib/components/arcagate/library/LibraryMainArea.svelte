<script lang="ts">
import { Plus, Search } from '@lucide/svelte';
import StatCard from '$lib/components/arcagate/common/StatCard.svelte';
import { launchItem } from '$lib/ipc/launch';
import { itemStore } from '$lib/state/items.svelte';
import LibraryCard from './LibraryCard.svelte';

interface Props {
	activeCategory: string | null;
	onSelectItem?: (id: string) => void;
	onAddItem?: () => void;
}

let { activeCategory, onSelectItem, onAddItem }: Props = $props();

let searchQuery = $state('');

$effect(() => {
	if (activeCategory) {
		void itemStore.loadItemsByCategory(activeCategory, searchQuery);
	}
});

let filteredItems = $derived.by(() => {
	if (activeCategory) {
		return itemStore.categoryItems;
	}
	if (searchQuery) {
		const q = searchQuery.toLowerCase();
		return itemStore.items.filter((item) => item.label.toLowerCase().includes(q));
	}
	return itemStore.items;
});
</script>

<main class="p-5">
	<!-- Search bar + sort chips -->
	<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
		<div
			class="flex min-w-0 flex-1 items-center gap-3 rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-4 py-3"
		>
			<Search class="h-5 w-5 text-[var(--ag-text-muted)]" />
			<input
				type="text"
				class="flex-1 bg-transparent text-sm text-[var(--ag-text-primary)] outline-none placeholder:text-[var(--ag-text-muted)]"
				placeholder="ライブラリを検索"
				autocomplete="off"
				bind:value={searchQuery}
			/>
		</div>
		<button
			type="button"
			class="flex items-center gap-2 rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-4 py-3 text-sm text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]"
			data-testid="add-item-button"
			onclick={() => onAddItem?.()}
		>
			<Plus class="h-4 w-4" />
			Add item
		</button>
	</div>

	<!-- Stat cards -->
	{#if itemStore.libraryStats}
		<div class="mb-4 grid grid-cols-2 lg:grid-cols-3 gap-3">
			<StatCard label="総アイテム" value={itemStore.libraryStats.total_items} />
			<StatCard label="カテゴリ" value={itemStore.libraryStats.total_categories} />
			<StatCard label="今週の起動" value={itemStore.libraryStats.recent_launch_count} />
		</div>
	{/if}

	<!-- Card grid -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 [&>*]:max-w-sm">
		{#each filteredItems as item (item.id)}
			<LibraryCard {item} onclick={() => onSelectItem?.(item.id)} ondblclick={() => void launchItem(item.id)} />
		{/each}
		{#if filteredItems.length === 0}
			<div class="col-span-full py-12 text-center text-sm text-[var(--ag-text-muted)]">
				{searchQuery ? `「${searchQuery}」に一致するアイテムはありません` : 'アイテムがまだありません'}
			</div>
		{/if}
	</div>
</main>
