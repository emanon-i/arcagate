<script lang="ts">
import { Star } from '@lucide/svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import { artMap, typeLabel } from '$lib/constants/item-type';
import { configStore } from '$lib/state/config.svelte';
import type { Item } from '$lib/types/item';

interface Props {
	item: Item;
	isStarred?: boolean;
	viewMode?: 'grid' | 'list';
	onclick?: () => void;
	ondblclick?: () => void;
}

let { item, isStarred = false, viewMode = 'grid', onclick, ondblclick }: Props = $props();

const ITEM_SIZE_PX: Record<string, number> = { S: 80, M: 128, L: 192 };
let cardSize = $derived(ITEM_SIZE_PX[configStore.itemSize] ?? 128);

let iconAreaClass = $derived(`h-[${cardSize}px] w-[${cardSize}px]`);

let iconClass = $derived.by(() => {
	if (item.icon_path) return 'h-full w-full object-cover';
	if (configStore.itemSize === 'S') return 'h-10 w-10 object-contain drop-shadow-lg';
	if (configStore.itemSize === 'L') return 'h-20 w-20 object-contain drop-shadow-lg';
	return 'h-14 w-14 object-contain drop-shadow-lg';
});
</script>

{#if viewMode === 'list'}
	<button
		type="button"
		class="flex w-full items-center gap-3 px-4 py-3 text-left transition-[background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-surface-4)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ag-accent)] {item.is_enabled ? '' : 'opacity-40 grayscale'}"
		data-testid="library-card-{item.id}"
		{onclick}
		{ondblclick}
	>
		<div class="relative shrink-0">
			<div class="flex h-9 w-9 items-center justify-center rounded-[var(--ag-radius-sm)] bg-gradient-to-br {artMap[item.item_type]}">
				<ItemIcon iconPath={item.icon_path} itemType={item.item_type} alt="{item.label} icon" class="h-5 w-5 object-contain" />
			</div>
			{#if isStarred}
				<div class="absolute -right-1 -top-1 rounded-full bg-[var(--ag-accent)] p-0.5" data-testid="starred-badge">
					<Star class="h-2 w-2 fill-white text-white" />
				</div>
			{/if}
		</div>
		<div class="min-w-0 flex-1">
			<div class="truncate text-sm font-medium text-[var(--ag-text-primary)]">{item.label}</div>
			<div class="truncate text-xs text-[var(--ag-text-muted)]">{item.target}</div>
		</div>
		<span class="shrink-0 rounded-full border border-[var(--ag-border)] bg-[var(--ag-surface-4)] px-2 py-0.5 text-[10px] text-[var(--ag-text-secondary)]">
			{typeLabel[item.item_type]}
		</span>
	</button>
{:else}
	<button
		type="button"
		class="w-full overflow-hidden rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-left transition-[border-color,background-color,transform,box-shadow] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:border-[var(--ag-border-hover)] hover:bg-[var(--ag-surface-4)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ag-surface-0)] {item.is_enabled ? '' : 'opacity-40 grayscale'}"
		data-testid="library-card-{item.id}"
		{onclick}
		{ondblclick}
	>
		<div class="relative flex {iconAreaClass} items-center justify-center bg-gradient-to-br {artMap[item.item_type]}">
			<ItemIcon iconPath={item.icon_path} itemType={item.item_type} alt="{item.label} icon" class={iconClass} />
			{#if isStarred}
				<div class="absolute right-2 top-2 rounded-full bg-[var(--ag-accent)]/90 p-1 shadow-sm" data-testid="starred-badge">
					<Star class="h-3 w-3 fill-white text-white" />
				</div>
			{/if}
		</div>
		{#if configStore.itemSize === 'S'}
			<div class="px-3 py-2">
				<div class="truncate text-xs font-semibold text-[var(--ag-text-primary)]">{item.label}</div>
			</div>
		{:else}
			<div class="space-y-3 p-4">
				<div class="flex items-start justify-between gap-3">
					<div>
						<div class="text-sm font-semibold text-[var(--ag-text-primary)]">{item.label}</div>
						<div class="mt-1 truncate text-xs text-[var(--ag-text-muted)]">
							{item.target}
						</div>
					</div>
					<span
						class="rounded-full border border-[var(--ag-border)] bg-[var(--ag-surface-4)] px-2 py-1 text-[10px] text-[var(--ag-text-secondary)]"
					>
						{typeLabel[item.item_type]}
					</span>
				</div>
			</div>
		{/if}
	</button>
{/if}
