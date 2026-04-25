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

let iconClass = $derived.by(() => {
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
		class="library-card relative aspect-[4/3] overflow-hidden rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-left transition-[border-color,background-color,transform,box-shadow] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:border-[var(--ag-border-hover)] hover:bg-[var(--ag-surface-4)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ag-surface-0)] {item.is_enabled ? '' : 'opacity-40 grayscale'}"
		style="width: var(--ag-card-w);"
		data-testid="library-card-{item.id}"
		{onclick}
		{ondblclick}
	>
		{#if item.icon_path}
			<ItemIcon iconPath={item.icon_path} itemType={item.item_type} alt="{item.label} icon" class="absolute inset-0 h-full w-full object-cover" />
		{:else}
			<div class="absolute inset-0 flex items-center justify-center bg-gradient-to-br {artMap[item.item_type]}">
				<ItemIcon iconPath={undefined} itemType={item.item_type} alt="{item.label} icon" class={iconClass} />
			</div>
		{/if}

		{#if isStarred}
			<div class="absolute right-2 top-2 rounded-full bg-[var(--ag-accent)]/90 p-1 shadow-sm" data-testid="starred-badge">
				<Star class="h-3 w-3 fill-white text-white" />
			</div>
		{/if}

		<span
			class="absolute left-2 top-2 rounded-full border border-white/30 bg-black/35 px-1.5 py-0.5 text-[10px] text-white/95 backdrop-blur-sm"
		>
			{typeLabel[item.item_type]}
		</span>

		<div
			class="library-card__label absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent {configStore.itemSize === 'S' ? 'px-2 pb-1.5 pt-3' : 'px-3 pb-2 pt-6'}"
		>
			<div
				class="truncate font-semibold text-white {configStore.itemSize === 'S' ? 'text-[11px]' : configStore.itemSize === 'L' ? 'text-base' : 'text-sm'}"
				style="paint-order: stroke fill; -webkit-text-stroke: 0.5px rgba(0,0,0,0.6);"
			>
				{item.label}
			</div>
			{#if configStore.itemSize !== 'S'}
				<div
					class="truncate text-white/80 {configStore.itemSize === 'L' ? 'text-xs' : 'text-[11px]'}"
					style="paint-order: stroke fill; -webkit-text-stroke: 0.5px rgba(0,0,0,0.6);"
				>
					{item.target}
				</div>
			{/if}
		</div>
	</button>
{/if}
