<script lang="ts">
import { Search } from '@lucide/svelte';
import { cubicOut } from 'svelte/easing';
import { fade, scale } from 'svelte/transition';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import { itemStore } from '$lib/state/items.svelte';
import type { Item } from '$lib/types/item';

interface Props {
	onSelect: (item: Item) => void;
	onClose: () => void;
}

let { onSelect, onClose }: Props = $props();

let searchQuery = $state('');
let debouncedQuery = $state('');

const rm =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;

$effect(() => {
	const q = searchQuery;
	const timer = setTimeout(() => {
		debouncedQuery = q;
	}, 150);
	return () => clearTimeout(timer);
});

let filteredItems = $derived.by(() => {
	if (!debouncedQuery.trim()) return itemStore.items.slice(0, 50);
	const q = debouncedQuery.toLowerCase();
	return itemStore.items.filter((i) => i.label.toLowerCase().includes(q)).slice(0, 50);
});
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
	role="dialog"
	aria-modal="true"
	aria-label="アイテム選択"
	tabindex="-1"
	transition:fade={{ duration: dFast }}
	onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
	onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
>
	<div
		class="flex w-full max-w-sm flex-col overflow-hidden rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] shadow-[var(--ag-shadow-dialog)]"
		style="max-height: 70vh;"
		transition:scale={{ duration: dNormal, start: 0.96, easing: cubicOut }}
	>
		<!-- Search bar -->
		<div class="flex items-center gap-3 border-b border-[var(--ag-border)] px-4 py-3">
			<Search class="h-4 w-4 shrink-0 text-[var(--ag-text-muted)]" />
			<!-- svelte-ignore a11y_autofocus -->
			<input
				type="text"
				class="min-w-0 flex-1 bg-transparent text-sm text-[var(--ag-text-primary)] outline-none placeholder:text-[var(--ag-text-muted)]"
				placeholder="アイテムを検索..."
				autofocus
				autocomplete="off"
				bind:value={searchQuery}
			/>
		</div>
		<!-- Item list -->
		<div class="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
			{#each filteredItems as item (item.id)}
				<button
					type="button"
					class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors duration-[var(--ag-duration-fast)] hover:bg-[var(--ag-surface-3)] focus-visible:outline-none focus-visible:bg-[var(--ag-surface-3)]"
					onclick={() => { onSelect(item); }}
				>
					<ItemIcon iconPath={item.icon_path} itemType={item.item_type} alt="{item.label} icon" class="h-6 w-6 shrink-0 object-contain" />
					<div class="min-w-0 flex-1">
						<div class="truncate font-medium text-[var(--ag-text-primary)]">{item.label}</div>
						<div class="truncate text-xs text-[var(--ag-text-muted)]">{item.target}</div>
					</div>
				</button>
			{/each}
			{#if filteredItems.length === 0}
				<div class="py-8 text-center text-sm text-[var(--ag-text-muted)]">
					{debouncedQuery ? '一致するアイテムがありません' : 'アイテムがまだありません'}
				</div>
			{/if}
		</div>
	</div>
</div>
