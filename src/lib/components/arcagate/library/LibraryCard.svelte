<script lang="ts">
import { Star } from '@lucide/svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import { artMap, typeLabel } from '$lib/constants/item-type';
import { getItemMetadata } from '$lib/ipc/items';
import { configStore } from '$lib/state/config.svelte';
import type { Item } from '$lib/types/item';
import type { ItemMetadata } from '$lib/types/item-metadata';
import { formatItemMeta } from '$lib/utils/format-meta';

interface Props {
	item: Item;
	isStarred?: boolean;
	viewMode?: 'grid' | 'list';
	onclick?: () => void;
	ondblclick?: () => void;
}

let { item, isStarred = false, viewMode = 'grid', onclick, ondblclick }: Props = $props();

let metadata = $state<ItemMetadata | null>(null);

// Lazy fetch: item ごとに 1 回だけ。S サイズでは表示しないので IPC も省略。
$effect(() => {
	if (viewMode !== 'grid' || configStore.itemSize === 'S') return;
	const id = item.id;
	void getItemMetadata(id)
		.then((m) => {
			if (id === item.id) metadata = m;
		})
		.catch(() => {
			// best-effort、失敗はメタデータ非表示
		});
});

let metaLines = $derived(metadata ? formatItemMeta(item, metadata) : null);

let iconClass = $derived.by(() => {
	if (configStore.itemSize === 'S') return 'h-10 w-10 object-contain drop-shadow-lg';
	if (configStore.itemSize === 'L') return 'h-20 w-20 object-contain drop-shadow-lg';
	return 'h-14 w-14 object-contain drop-shadow-lg';
});

let bg = $derived(configStore.libraryCard.background);
let style = $derived(configStore.libraryCard.style);

let labelStyle = $derived.by(() => {
	const stroke = style.strokeEnabled ? `${style.strokeWidthPx}px ${style.strokeColor}` : 'none';
	return `color: ${style.textColor}; -webkit-text-stroke: ${stroke}; paint-order: stroke fill;`;
});

let resolvedMode = $derived.by(() => {
	if (bg.mode === 'image' && !item.icon_path) return 'fill';
	return bg.mode;
});

// pre-compute size-dependent classes (avoid repeated ternary in template)
let labelPadClass = $derived(configStore.itemSize === 'S' ? 'px-2 pb-1.5 pt-3' : 'px-3 pb-2 pt-6');
let labelFontClass = $derived(
	configStore.itemSize === 'S'
		? 'text-[11px]'
		: configStore.itemSize === 'L'
			? 'text-base'
			: 'text-sm',
);
let targetFontClass = $derived(configStore.itemSize === 'L' ? 'text-xs' : 'text-[11px]');
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
		{#if resolvedMode === 'image' && item.icon_path}
			<ItemIcon
				iconPath={item.icon_path}
				itemType={item.item_type}
				alt="{item.label} icon"
				class="absolute inset-0 h-full w-full object-cover"
				style="object-position: {bg.focalX}% {bg.focalY}%;"
			/>
		{:else if resolvedMode === 'fill'}
			<div class="absolute inset-0 flex items-center justify-center" style="background: {bg.fillBgColor};">
				<ItemIcon
					iconPath={undefined}
					itemType={item.item_type}
					alt="{item.label} icon"
					class={iconClass}
					style="color: {bg.fillIconColor};"
				/>
			</div>
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
			class="library-card__label absolute inset-x-0 bottom-0 {style.overlayEnabled
				? 'bg-gradient-to-t from-black/75 via-black/40 to-transparent'
				: ''} {labelPadClass}"
		>
			<div class="truncate font-semibold {labelFontClass}" style={labelStyle}>{item.label}</div>
			{#if configStore.itemSize !== 'S'}
				<div class="truncate {targetFontClass} opacity-80" style={labelStyle}>
					{metaLines?.line1 || item.target}
				</div>
			{/if}
			{#if configStore.itemSize === 'L' && metaLines?.line2}
				<div class="truncate text-[10px] opacity-70" style={labelStyle}>
					{metaLines.line2}
				</div>
			{/if}
		</div>
	</button>
{/if}
