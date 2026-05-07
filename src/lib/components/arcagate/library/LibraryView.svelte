<script lang="ts">
import { HelpCircle, Package } from '@lucide/svelte';
import { onDestroy, onMount } from 'svelte';
import StatCard from '$lib/components/arcagate/common/StatCard.svelte';
import EmptyState from '$lib/components/common/EmptyState.svelte';
import LoadingState from '$lib/components/common/LoadingState.svelte';
import { configStore } from '$lib/state/config.svelte';
import { helpStore } from '$lib/state/help.svelte';
import { itemStore } from '$lib/state/items.svelte';
import type { Item } from '$lib/types/item';
import { markEnd, markStart, PERF_LABELS } from '$lib/utils/perf';
import LibraryCard from './LibraryCard.svelte';
import { getSizeClasses } from './library-card-sizes';

// Library hot path 計測 (mount/unmount)。
onMount(() => markStart(PERF_LABELS.libraryViewMount));
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
}: Props = $props();

// Phase L-3 (2026-05-07 user 検収 Library 真因 #3):
// LibraryCard 内で itemSize-only 5 個の $derived (iconClassFilled / iconClassNone / labelPadClass /
// labelFontClass / targetFontClass) が 690 cards × 5 = 3450 reactive deps を生み、itemSize
// 変更時 JS longtask 1.2 秒の主因だった。共有 module で 1 回 derive、props 配布で 3450× 効率化。
let sizeClasses = $derived(getSizeClasses(configStore.itemSize));
</script>

<!-- Stat cards -->
{#if itemStore.libraryStats}
	<div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
		<StatCard label="総アイテム" value={itemStore.libraryStats.total_items} />
		<StatCard label="タグ" value={itemStore.libraryStats.total_tags} />
		<StatCard label="今週の起動" value={itemStore.libraryStats.recent_launch_count} />
	</div>
{/if}

<!-- Card grid / list -->
{#if itemStore.loading && itemStore.items.length === 0}
	<LoadingState description="ライブラリを読み込み中..." testId="library-loading" />
{:else if viewMode === 'list'}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="overflow-hidden rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] divide-y divide-[var(--ag-border)]"
		bind:this={gridContainerEl}
		onkeydown={onGridKeydown}
	>
		{#each filteredItems as item (item.id)}
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
			/>
		{/each}
		{#if filteredItems.length === 0}
			{#if !searchQuery && !activeTag && itemStore.items.length === 0}
				<EmptyState
					icon={Package}
					title="ライブラリが空です"
					description="アプリ・フォルダ・URL などのショートカットを追加できます"
					actions={[
						{ label: 'アイテムを追加', onClick: () => onAddItem?.(), variant: 'default' },
						{
							label: 'ヘルプを見る',
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
						? `「${searchQuery}」に一致するアイテムはありません`
						: activeTag
							? 'このタグにアイテムがありません'
							: 'アイテムがまだありません'}
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
			/>
		{/each}
		{#if filteredItems.length === 0}
			{#if !searchQuery && !activeTag && itemStore.items.length === 0}
				<div class="col-span-full">
					<EmptyState
						icon={Package}
						title="ライブラリが空です"
						description="アプリ・フォルダ・URL などのショートカットを追加できます"
						action={{ label: 'アイテムを追加', onClick: () => onAddItem?.() }}
						testId="library-empty-state-grid"
					/>
				</div>
			{:else}
				<div class="col-span-full py-12 text-center text-sm text-[var(--ag-text-muted)]">
					{searchQuery
						? `「${searchQuery}」に一致するアイテムはありません`
						: activeTag
							? 'このタグにアイテムがありません'
							: 'アイテムがまだありません'}
				</div>
			{/if}
		{/if}
	</div>
{/if}
