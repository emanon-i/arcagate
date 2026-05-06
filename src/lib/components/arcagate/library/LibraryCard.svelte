<script lang="ts">
import { Star } from '@lucide/svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import { artMap, typeLabel } from '$lib/constants/item-type';
import { configStore } from '$lib/state/config.svelte';
import { metadataStore } from '$lib/state/metadata.svelte';
import type { Item } from '$lib/types/item';
import { formatItemMeta } from '$lib/utils/format-meta';

interface Props {
	item: Item;
	isStarred?: boolean;
	isSelected?: boolean;
	viewMode?: 'grid' | 'list';
	onclick?: () => void;
	ondblclick?: () => void;
}

let {
	item,
	isStarred = false,
	isSelected = false,
	viewMode = 'grid',
	onclick,
	ondblclick,
}: Props = $props();

// metadataStore は親 (LibraryMainArea / LibraryItemPicker) が
// loadMetadataForItems(visibleIds) で warm up する。card は cache を読むだけ。
// 旧実装の per-card cmd_get_item_metadata 並列呼び出し (I3 root cause) を排除。
let metadata = $derived(
	viewMode === 'grid' && configStore.itemSize !== 'S' ? metadataStore.getMetadata(item.id) : null,
);

let metaLines = $derived(metadata ? formatItemMeta(item, metadata) : null);

// fill / image モード時の中央アイコン: drop-shadow-lg で立体感
let iconClassFilled = $derived.by(() => {
	if (configStore.itemSize === 'S') return 'h-10 w-10 object-contain drop-shadow-lg';
	if (configStore.itemSize === 'L') return 'h-20 w-20 object-contain drop-shadow-lg';
	return 'h-14 w-14 object-contain drop-shadow-lg';
});

// none モード時: 強い drop-shadow がアイコンの edge をぼやけさせるため、
// shadow を弱め + サイズを少し大きくして相対的に明瞭化（PH-292 修正）
let iconClassNone = $derived.by(() => {
	if (configStore.itemSize === 'S') return 'h-12 w-12 object-contain drop-shadow-sm';
	if (configStore.itemSize === 'L') return 'h-24 w-24 object-contain drop-shadow-sm';
	return 'h-16 w-16 object-contain drop-shadow-sm';
});

// PH-290: per-card override を global にマージ（背景・文字とも部分上書き）
let cardOverride = $derived.by(() => {
	if (!item.card_override_json) return null;
	try {
		return JSON.parse(item.card_override_json) as {
			background?: Partial<typeof configStore.libraryCard.background>;
			style?: Partial<typeof configStore.libraryCard.style>;
		};
	} catch {
		return null;
	}
});
let bg = $derived({
	...configStore.libraryCard.background,
	...(cardOverride?.background ?? {}),
});
let style = $derived({
	...configStore.libraryCard.style,
	...(cardOverride?.style ?? {}),
});

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
	configStore.itemSize === 'S' ? 'text-xs' : configStore.itemSize === 'L' ? 'text-base' : 'text-sm',
);
let targetFontClass = $derived(configStore.itemSize === 'L' ? 'text-xs' : 'text-xs');
</script>

{#if viewMode === 'list'}
	<!-- B-6 #1: isSelected で Industrial Yellow 強調 (ring-2 + bg accent overlay) -->
	<button
		type="button"
		class="flex w-full items-center gap-3 px-4 py-3 text-left transition-[background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-surface-4)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ag-accent)] {isSelected
			? 'bg-[var(--ag-accent)]/15 ring-2 ring-inset ring-[var(--ag-accent)]'
			: ''} {item.is_enabled ? '' : 'opacity-40 grayscale'}"
		data-testid="library-card-{item.id}"
		aria-pressed={isSelected}
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
		<span class="shrink-0 rounded-full border border-[var(--ag-border)] bg-[var(--ag-surface-4)] px-2 py-0.5 text-xs text-[var(--ag-text-secondary)]">
			{typeLabel[item.item_type]}
		</span>
	</button>
{:else}
	<!-- B-6 #1: isSelected で Industrial Yellow 強調 (ring-4 + border accent + scale) -->
	<button
		type="button"
		class="library-card relative aspect-[4/3] overflow-hidden rounded-[var(--ag-radius-card)] border bg-[var(--ag-surface-3)] text-left transition-[border-color,background-color,transform,box-shadow] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:border-[var(--ag-border-hover)] hover:bg-[var(--ag-surface-4)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ag-surface-0)] {isSelected
			? 'border-[var(--ag-accent)] ring-4 ring-[var(--ag-accent)]/60'
			: 'border-[var(--ag-border)]'} {item.is_enabled ? '' : 'opacity-40 grayscale'}"
		style="width: var(--ag-card-w);"
		data-testid="library-card-{item.id}"
		aria-pressed={isSelected}
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
					class={iconClassFilled}
					style="color: {bg.fillIconColor};"
				/>
			</div>
		{:else}
			<div class="absolute inset-0 flex items-center justify-center bg-gradient-to-br {artMap[item.item_type]}">
				<ItemIcon iconPath={undefined} itemType={item.item_type} alt="{item.label} icon" class={iconClassNone} />
			</div>
		{/if}

		{#if isStarred}
			<div class="absolute right-2 top-2 rounded-full bg-[var(--ag-accent)]/90 p-1 shadow-sm" data-testid="starred-badge">
				<Star class="h-3 w-3 fill-white text-white" />
			</div>
		{/if}

		<span
			class="absolute left-2 top-2 rounded-full border border-white/30 bg-black/35 px-1.5 py-0.5 text-xs text-white/95 backdrop-blur-sm"
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
				<div class="truncate text-xs opacity-70" style={labelStyle}>
					{metaLines.line2}
				</div>
			{/if}
		</div>
	</button>
{/if}

<style>
/* L3-A: CSS-native virtualization。
   200+ item の grid で off-screen card の paint / layout を browser に任せ、
   @tanstack/virtual 等の重い JS lib なしで frame drop を解消する。
   Tauri は WebView2 (Chromium) なので content-visibility: auto は確実に動く。
   contain-intrinsic-size は viewport 外の card の予約サイズ (aspect 4:3 想定)、
   browser がこれを使って scrollbar / scroll position 計算を維持する。
   focus / a11y / drag-drop は通常 DOM のため壊れない (full virtualizer の退行 risk 高 を回避)。 */
.library-card {
	content-visibility: auto;
	contain-intrinsic-size: auto var(--ag-card-w);
}
</style>
