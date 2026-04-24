<script lang="ts">
import { ChevronRight, Search, X as XIcon } from '@lucide/svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import type { Item } from '$lib/types/item';
import type { WidgetSortField } from '$lib/types/widget-list';

interface Props {
	items: Item[];
	sortField?: WidgetSortField;
	iconClass?: string;
	showTarget?: boolean;
	onLaunch: (id: string) => void;
	onContext?: (id: string) => void;
	emptyMessage?: string;
}

let {
	items,
	sortField = 'default',
	iconClass = 'h-5 w-5 shrink-0 object-cover',
	showTarget = false,
	onLaunch,
	onContext,
	emptyMessage = 'アイテムがありません',
}: Props = $props();

let searchQuery = $state('');
let searchVisible = $state(false);

let displayItems = $derived.by(() => {
	let list = items;
	if (searchQuery.trim()) {
		const q = searchQuery.toLowerCase();
		list = list.filter((i) => i.label.toLowerCase().includes(q));
	}
	if (sortField === 'name') {
		list = [...list].sort((a, b) => a.label.localeCompare(b.label, 'ja'));
	}
	return list;
});

function toggleSearch() {
	searchVisible = !searchVisible;
	if (!searchVisible) searchQuery = '';
}
</script>

<div class="flex flex-col gap-2">
	{#if searchVisible}
		<div class="flex items-center gap-1 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2 py-1">
			<Search class="h-3.5 w-3.5 shrink-0 text-[var(--ag-text-muted)]" />
			<!-- svelte-ignore a11y_autofocus -->
			<input
				type="text"
				class="min-w-0 flex-1 bg-transparent text-xs text-[var(--ag-text-primary)] outline-none placeholder:text-[var(--ag-text-faint)]"
				placeholder="絞り込み..."
				autofocus
				autocomplete="off"
				bind:value={searchQuery}
			/>
			<button
				type="button"
				class="rounded p-0.5 text-[var(--ag-text-muted)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none"
				onclick={toggleSearch}
				aria-label="検索を閉じる"
			>
				<XIcon class="h-3 w-3" />
			</button>
		</div>
	{:else}
		<div class="flex justify-end">
			<button
				type="button"
				class="rounded p-0.5 text-[var(--ag-text-faint)] transition-colors duration-[var(--ag-duration-fast)] hover:text-[var(--ag-text-muted)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ag-accent)]"
				onclick={toggleSearch}
				aria-label="絞り込み検索"
			>
				<Search class="h-3.5 w-3.5" />
			</button>
		</div>
	{/if}

	<div class="space-y-1.5">
		{#each displayItems as item (item.id)}
			<button
				type="button"
				class="flex w-full items-center justify-between rounded-2xl bg-[var(--ag-surface-3)] px-3 py-2.5 text-sm text-[var(--ag-text-secondary)] transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)]"
				onclick={() => onLaunch(item.id)}
				oncontextmenu={(e) => {
					if (onContext) {
						e.preventDefault();
						onContext(item.id);
					}
				}}
			>
				<span class="flex min-w-0 flex-1 items-center gap-2">
					<ItemIcon iconPath={item.icon_path} alt="{item.label} icon" class={iconClass} />
					<span class="truncate">{item.label}</span>
				</span>
				{#if showTarget}
					<span class="shrink-0 max-w-[40%] truncate text-xs text-[var(--ag-text-muted)]">{item.target}</span>
				{:else}
					<ChevronRight class="h-4 w-4 shrink-0 text-[var(--ag-text-faint)]" />
				{/if}
			</button>
		{/each}
		{#if displayItems.length === 0}
			<div class="py-4 text-center text-xs text-[var(--ag-text-muted)]">
				{searchQuery ? '一致するアイテムがありません' : emptyMessage}
			</div>
		{/if}
	</div>
</div>
