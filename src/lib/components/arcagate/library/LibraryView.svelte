<script lang="ts">
import { HelpCircle, Package, Play, Settings2, Star } from '@lucide/svelte';
import { onDestroy, onMount } from 'svelte';
import StatCard from '$lib/components/arcagate/common/StatCard.svelte';
import ContextMenu from '$lib/components/common/ContextMenu.svelte';
import EmptyState from '$lib/components/common/EmptyState.svelte';
import LoadingState from '$lib/components/common/LoadingState.svelte';
import { t } from '$lib/i18n.svelte';
import { configStore } from '$lib/state/config.svelte';
import { helpStore } from '$lib/state/help.svelte';
import { itemStore } from '$lib/state/items.svelte';
import type { Item } from '$lib/types/item';
import { markEnd, markStart, PERF_LABELS } from '$lib/utils/perf';
import { tl } from '$lib/utils/perf-timeline';
import LibraryCard from './LibraryCard.svelte';
import { getSizeClasses } from './library-card-sizes';

// Library hot path 計測 (mount/unmount)。
tl('LibraryView: instantiate (before card {#each})');
onMount(() => {
	markStart(PERF_LABELS.libraryViewMount);
	// Svelte は親 onMount を全子 mount 後に呼ぶ → ここ = 全 LibraryCard mount 完了点。
	tl('LibraryView: mounted (all LibraryCard mounted)');
});
onDestroy(() => {
	const dur = markEnd(PERF_LABELS.libraryViewMount);
	if (dur !== null && dur > 200) {
		console.warn(`[perf] LibraryView lifetime ${dur.toFixed(1)}ms (long)`);
	}
});

/**
 * Library card grid / list view + Stat cards + EmptyState fallbacks。
 *
 * 引用元 guideline:
 *   docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、view を抽出)
 *
 * - filteredItems を受けて grid (auto-fill repeat) / list (divide-y) で表示
 * - keyboard nav 用 gridContainerEl は $bindable で親に返す
 * - itemStore / configStore / helpStore は global singleton で直接参照
 */
interface Props {
	filteredItems: Item[];
	starredIds: Set<string>;
	selectedIds: Set<string>;
	viewMode: 'grid' | 'list';
	selectionMode: boolean;
	searchQuery: string;
	activeTag: string | null;
	gridContainerEl?: HTMLDivElement | null;
	onSelectItem?: (id: string | null) => void;
	onLaunch: (item: Item) => void;
	onToggleSelection: (id: string) => void;
	onAddItem?: () => void;
	onGridKeydown: (e: KeyboardEvent) => void;
	/** 2026-05-17: 右クリックメニュー「設定を開く」用。 item 編集 dialog を開く。 */
	onEditItem?: (id: string) => void;
}

let {
	filteredItems,
	starredIds,
	selectedIds,
	viewMode,
	selectionMode,
	searchQuery,
	activeTag,
	gridContainerEl = $bindable(null),
	onSelectItem,
	onLaunch,
	onToggleSelection,
	onAddItem,
	onGridKeydown,
	onEditItem,
}: Props = $props();

// 2026-05-17 user 検収: Library カードの専用コンテキストメニュー (起動 / お気に入り / 設定を開く)。
let cardMenu = $state<{ open: boolean; x: number; y: number; item: Item | null }>({
	open: false,
	x: 0,
	y: 0,
	item: null,
});

function openCardMenu(e: MouseEvent, item: Item): void {
	e.preventDefault();
	cardMenu = { open: true, x: e.clientX, y: e.clientY, item };
}

function closeCardMenu(): void {
	cardMenu = { ...cardMenu, open: false };
}

function menuLaunch(): void {
	const item = cardMenu.item;
	closeCardMenu();
	if (item) onLaunch(item);
}

function menuToggleStar(): void {
	const item = cardMenu.item;
	closeCardMenu();
	if (item) void itemStore.toggleStar(item.id, !starredIds.has(item.id));
}

function menuOpenSettings(): void {
	const item = cardMenu.item;
	closeCardMenu();
	if (item) onEditItem?.(item.id);
}

// Phase L-3 (2026-05-07 user 検収 Library 真因 #3):
// LibraryCard 内で itemSize-only 4 個の $derived (iconClassNone / labelPadClass /
// labelFontClass / targetFontClass) が 690 cards 分の reactive deps を生み、itemSize
// 変更時 JS longtask 1.2 秒の主因だった。共有 module で 1 回 derive、props 配布で効率化。
let sizeClasses = $derived(getSizeClasses(configStore.itemSize));
</script>

<!-- Stat cards -->
{#if itemStore.libraryStats}
	<div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
		<StatCard label={t('library.stats.total')} value={itemStore.libraryStats.total_items} />
		<StatCard label={t('library.stats.tags')} value={itemStore.libraryStats.total_tags} />
		<StatCard label={t('library.stats.recent')} value={itemStore.libraryStats.recent_launch_count} />
	</div>
{/if}

<!-- Card grid / list -->
{#if itemStore.loading && itemStore.items.length === 0}
	<LoadingState description={t('library.loading')} testId="library-loading" />
{:else if viewMode === 'list'}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="overflow-hidden rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] divide-y divide-[var(--ag-border)]"
		bind:this={gridContainerEl}
		onkeydown={onGridKeydown}
	>
		{#each filteredItems as item (item.id)}
			{#key `${item.card_override_json ?? ''}|${item.icon_path ?? ''}`}
				<LibraryCard
					{item}
					{viewMode}
					{sizeClasses}
					isStarred={starredIds.has(item.id)}
					isSelected={selectedIds.has(item.id)}
					onclick={() => {
						if (selectionMode) onToggleSelection(item.id);
						else onSelectItem?.(item.id);
					}}
					ondblclick={() => onLaunch(item)}
					oncontextmenu={(e) => openCardMenu(e, item)}
				/>
			{/key}
		{/each}
		{#if filteredItems.length === 0}
			{#if !searchQuery && !activeTag && itemStore.items.length === 0}
				<EmptyState
					icon={Package}
					title={t('library.empty_title')}
					description={t('library.empty_description')}
					actions={[
						{ label: t('library.add_item'), onClick: () => onAddItem?.(), variant: 'default' },
						{
							label: t('library.see_help'),
							onClick: () => helpStore.open(),
							variant: 'outline',
							icon: HelpCircle,
						},
					]}
					testId="library-empty-state"
				/>
			{:else}
				<div class="py-12 text-center text-sm text-[var(--ag-text-muted)]">
					{searchQuery
						? t('library.no_match_query', { query: searchQuery })
						: activeTag
							? t('library.no_match_tag')
							: t('library.no_items_yet')}
				</div>
			{/if}
		{/if}
	</div>
{:else}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="library-grid grid"
		style="grid-template-columns: repeat(auto-fill, var(--ag-card-w)); gap: var(--ag-card-gap); justify-content: center; --ag-card-w: var(--ag-card-w-{configStore.itemSize.toLowerCase()});"
		bind:this={gridContainerEl}
		onkeydown={onGridKeydown}
	>
		{#each filteredItems as item (item.id)}
			{#key `${item.card_override_json ?? ''}|${item.icon_path ?? ''}`}
				<LibraryCard
					{item}
					{sizeClasses}
					isStarred={starredIds.has(item.id)}
					isSelected={selectedIds.has(item.id)}
					onclick={() => {
						if (selectionMode) onToggleSelection(item.id);
						else onSelectItem?.(item.id);
					}}
					ondblclick={() => onLaunch(item)}
					oncontextmenu={(e) => openCardMenu(e, item)}
				/>
			{/key}
		{/each}
		{#if filteredItems.length === 0}
			{#if !searchQuery && !activeTag && itemStore.items.length === 0}
				<div class="col-span-full">
					<EmptyState
						icon={Package}
						title={t('library.empty_title')}
						description={t('library.empty_description')}
						action={{ label: t('library.add_item'), onClick: () => onAddItem?.() }}
						testId="library-empty-state-grid"
					/>
				</div>
			{:else}
				<div class="col-span-full py-12 text-center text-sm text-[var(--ag-text-muted)]">
					{searchQuery
						? t('library.no_match_query', { query: searchQuery })
						: activeTag
							? t('library.no_match_tag')
							: t('library.no_items_yet')}
				</div>
			{/if}
		{/if}
	</div>
{/if}

<ContextMenu open={cardMenu.open} x={cardMenu.x} y={cardMenu.y} onClose={closeCardMenu}>
	{#if cardMenu.item}
		<div class="border-b border-[var(--ag-border)] px-3 py-1.5 text-xs text-[var(--ag-text-muted)]">
			<p class="truncate font-medium text-[var(--ag-text-secondary)]">{cardMenu.item.label}</p>
		</div>
		<button
			type="button"
			role="menuitem"
			class="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[var(--ag-text-primary)] focus-visible:bg-[var(--ag-surface-3)] focus-visible:outline-none hover:bg-[var(--ag-surface-3)]"
			data-testid="library-context-launch"
			onclick={menuLaunch}
		>
			<Play class="h-3.5 w-3.5" />
			{t('context_menu.launch')}
		</button>
		<button
			type="button"
			role="menuitem"
			class="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[var(--ag-text-primary)] focus-visible:bg-[var(--ag-surface-3)] focus-visible:outline-none hover:bg-[var(--ag-surface-3)]"
			data-testid="library-context-toggle-star"
			onclick={menuToggleStar}
		>
			<Star class="h-3.5 w-3.5" />
			{starredIds.has(cardMenu.item.id)
				? t('context_menu.favorite_remove')
				: t('context_menu.favorite_add')}
		</button>
		<button
			type="button"
			role="menuitem"
			class="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[var(--ag-text-primary)] focus-visible:bg-[var(--ag-surface-3)] focus-visible:outline-none hover:bg-[var(--ag-surface-3)]"
			data-testid="library-context-open-settings"
			onclick={menuOpenSettings}
		>
			<Settings2 class="h-3.5 w-3.5" />
			{t('context_menu.open_settings')}
		</button>
	{/if}
</ContextMenu>
