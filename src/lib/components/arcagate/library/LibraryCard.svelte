<script lang="ts">
import { Star } from '@lucide/svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import { typeLabel } from '$lib/constants/item-type';
import { configStore, DEFAULT_CARD_BACKGROUND } from '$lib/state/config.svelte';
import { metadataStore } from '$lib/state/metadata.svelte';
import type { Item } from '$lib/types/item';
import { cardRotationTransform, parseCardOverride } from '$lib/utils/card-override';
import { formatItemMeta } from '$lib/utils/format-meta';
import type { SizeClasses } from './library-card-sizes';

/**
 * Phase L-3 (2026-05-07 user 検収 Library 真因 #3):
 * itemSize-only な class derive (5 件) は parent (LibraryView / LibraryItemPicker) で 1 度だけ
 * 計算し、sizeClasses prop で全 card に共有配布する。690 cards × 5 = 3450 reactive deps を
 * 1 hook deps に削減し、itemSize 変更時の longtask を解消する。type は library-card-sizes.ts。
 */
interface Props {
	item: Item;
	sizeClasses: SizeClasses;
	isStarred?: boolean;
	isSelected?: boolean;
	viewMode?: 'grid' | 'list';
	onclick?: () => void;
	ondblclick?: () => void;
	oncontextmenu?: (e: MouseEvent) => void;
}

let {
	item,
	sizeClasses,
	isStarred = false,
	isSelected = false,
	viewMode = 'grid',
	onclick,
	ondblclick,
	oncontextmenu,
}: Props = $props();

// metadataStore は親 (LibraryMainArea / LibraryItemPicker) が
// loadMetadataForItems(visibleIds) で warm up する。card は cache を読むだけ。
// 旧実装の per-card cmd_get_item_metadata 並列呼び出し (I3 root cause) を排除。
let metadata = $derived(
	viewMode === 'grid' && configStore.itemSize !== 'S' ? metadataStore.getMetadata(item.id) : null,
);

let metaLines = $derived(metadata ? formatItemMeta(item, metadata) : null);

// per-card override を default にマージ（背景・文字とも部分上書き）。
// E-8 fix (2026-05-07): card_override 変更時 LibraryCard 未更新 bug fix (parseCardOverride helper で signal-clean)。
// L-batch (2026-05-10 perf): override 無し (大半のカード) では default 参照を
// そのまま返して spread allocation を回避。N cards × 2 spread の object 生成を回避。
let cardOverride = $derived(parseCardOverride(item.card_override_json));
let bg = $derived(
	cardOverride?.background
		? { ...DEFAULT_CARD_BACKGROUND, ...cardOverride.background }
		: DEFAULT_CARD_BACKGROUND,
);
let style = $derived(
	cardOverride?.style
		? { ...configStore.libraryCard.style, ...cardOverride.style }
		: configStore.libraryCard.style,
);

let labelStyle = $derived.by(() => {
	const stroke = style.strokeEnabled ? `${style.strokeWidthPx}px ${style.strokeColor}` : 'none';
	return `color: ${style.textColor}; -webkit-text-stroke: ${stroke}; paint-order: stroke fill;`;
});

// override の background + icon_path で全面 cover 表示。override 無し (大半のカード) は
// default = 共通 surface + 中央アイコン (item.icon_path or タイプ fallback)。
let isFullBleed = $derived(!!cardOverride?.background && !!item.icon_path);

// 全面表示画像の object-position + 90 度刻み回転。
let bgImageStyle = $derived.by(() => {
	const transform = cardRotationTransform(bg.rotation);
	return `object-position: ${bg.offsetX}% ${bg.offsetY}%;${
		transform ? ` transform: ${transform};` : ''
	}`;
});
</script>

{#if viewMode === 'list'}
	<!-- B-6 #1: isSelected で Industrial Yellow 強調 (ring-2 + bg accent overlay) -->
	<button
		type="button"
		class="flex w-full items-center gap-3 px-4 py-3 text-left transition-[background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-surface-4)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ag-accent)] {isSelected
			? 'bg-[var(--ag-accent)]/15 ring-2 ring-inset ring-[var(--ag-accent)]'
			: ''} {item.is_enabled
			? ''
			: 'opacity-40 grayscale shadow-inner ring-1 ring-inset ring-[var(--ag-border)]'}"
		data-testid="library-card-{item.id}"
		aria-pressed={isSelected}
		{onclick}
		{ondblclick}
		{oncontextmenu}
	>
		<div class="relative shrink-0">
			<div class="flex h-9 w-9 items-center justify-center rounded-[var(--ag-radius-sm)] bg-[var(--ag-surface-4)]">
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
			: 'border-[var(--ag-border)]'} {item.is_enabled ? '' : 'opacity-40 grayscale shadow-inner'}"
		style="width: var(--ag-card-w);"
		data-testid="library-card-{item.id}"
		aria-pressed={isSelected}
		{onclick}
		{ondblclick}
		{oncontextmenu}
	>
		{#if isFullBleed}
			<ItemIcon
				iconPath={item.icon_path}
				itemType={item.item_type}
				alt="{item.label} icon"
				class="absolute inset-0 h-full w-full object-cover"
				style={bgImageStyle}
			/>
		{:else}
			<div class="absolute inset-0 flex items-center justify-center">
				<ItemIcon iconPath={item.icon_path} itemType={item.item_type} alt="{item.label} icon" class={sizeClasses.iconClassNone} />
			</div>
		{/if}

		{#if isStarred}
			<div class="absolute right-2 top-2 rounded-full bg-[var(--ag-accent)] p-1 shadow-[var(--ag-shadow-sm)]" data-testid="starred-badge">
				<Star class="h-3 w-3 fill-white text-white" />
			</div>
		{/if}

		<!-- Type chip (folder / exe / url 等)。 image cover の上に出る overlay なので
		     scrim + glass-tint で読みやすさを担保 (theme 横断、 token 経由)。
		     backdrop-blur-sm は image 上 chip の読みやすさを高める専用 frost (image 無 card
		     でも害は無い)。  allow:design-tokens-v2 -->
		<span
			class="absolute left-2 top-2 rounded-full border border-[color-mix(in_oklab,var(--c-glass-tint),transparent_70%)] bg-[var(--scrim)] px-1.5 py-0.5 text-xs text-[var(--c-glass-tint)] backdrop-blur-sm"
		>
			{typeLabel[item.item_type]}
		</span>

		<!-- Label overlay gradient: image 上に label が読めるよう下端を scrim で暗くする。
		     theme 横断で「画像上 → 文字読みやすい」が変わらないので scrim token 経由。 -->
		<div
			class="library-card__label absolute inset-x-0 bottom-0 {style.overlayEnabled
				? 'bg-gradient-to-t from-[var(--scrim)] via-[color-mix(in_oklab,var(--scrim),transparent_50%)] to-transparent'
				: ''} {sizeClasses.labelPadClass}"
		>
			<div class="truncate font-semibold {sizeClasses.labelFontClass}" style={labelStyle}>
				{item.label}
			</div>
			{#if configStore.itemSize !== 'S'}
				<div class="truncate {sizeClasses.targetFontClass} opacity-80" style={labelStyle}>
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
