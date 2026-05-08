<script lang="ts">
import { Eye, EyeOff, LayoutGrid, LayoutList, Plus } from '@lucide/svelte';
import { configStore } from '$lib/state/config.svelte';
import { SORT_FIELD_LABELS, type SortField, type SortOrder } from '$lib/utils/library-sort';

/**
 * Library 上部 controls (sort field / order / view mode / add button / selection mode toggle)。
 *
 * 引用元 guideline:
 *   docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、sort controls 抽出)
 *
 * - configStore.librarySort 直接参照 (global singleton、props 不要)
 * - viewMode / selectionMode は $bindable で親と双方向
 * - searchActive=true で sort disabled (fuzzy score が優先)
 */
interface Props {
	viewMode: 'grid' | 'list';
	selectionMode: boolean;
	searchActive: boolean;
	onAddItem?: () => void;
	onSelectionToggle?: () => void;
}

let {
	viewMode = $bindable('grid'),
	selectionMode = $bindable(false),
	searchActive,
	onAddItem,
	onSelectionToggle,
}: Props = $props();
</script>

<div class="flex items-center gap-2">
	<!-- F-1 (2026-05-08 user 検収): 非表示アイテム表示 toggle button。
	     default: 非表示 (Eye-off icon)、click で全件表示 (Eye icon)。configStore.libraryShowHidden に永続化。 -->
	<button
		type="button"
		class="rounded-[var(--ag-radius-sm)] border border-[var(--ag-border)] p-2 transition-[background-color,color,transform] duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)] {configStore.libraryShowHidden
			? 'bg-[var(--ag-accent-bg)] text-[var(--ag-accent-text)]'
			: 'bg-[var(--ag-surface-3)] text-[var(--ag-text-muted)]'}"
		aria-label={configStore.libraryShowHidden ? '非表示アイテムを隠す' : '非表示アイテムを表示'}
		title={configStore.libraryShowHidden ? '非表示アイテムを隠す' : '非表示アイテムを表示'}
		data-testid="library-show-hidden-toggle"
		onclick={() => configStore.setLibraryShowHidden(!configStore.libraryShowHidden)}
	>
		{#if configStore.libraryShowHidden}
			<Eye class="h-4 w-4" />
		{:else}
			<EyeOff class="h-4 w-4" />
		{/if}
	</button>
	<!-- L2-C C1: sort dropdown (field + asc/desc)。debouncedQuery 入力中は fuzzy score 順が
	     優先されるため見た目上 disable 状態に。 -->
	<select
		class="rounded-[var(--ag-radius-sm)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2 py-1.5 text-xs text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] disabled:opacity-60"
		aria-label="並び順を選ぶ"
		data-testid="library-sort-field"
		disabled={searchActive}
		value={configStore.librarySort.field}
		onchange={(e) => {
			const v = (e.currentTarget as HTMLSelectElement).value as SortField;
			configStore.setLibrarySort(v, configStore.librarySort.order);
		}}
	>
		<option value="name">{SORT_FIELD_LABELS.name}</option>
		<option value="created">{SORT_FIELD_LABELS.created}</option>
		<option value="updated">{SORT_FIELD_LABELS.updated}</option>
	</select>
	<button
		type="button"
		class="rounded-[var(--ag-radius-sm)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2 py-1.5 text-xs text-[var(--ag-text-primary)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)] disabled:opacity-60"
		aria-label={configStore.librarySort.order === 'asc' ? '昇順' : '降順'}
		data-testid="library-sort-order"
		disabled={searchActive}
		onclick={() => {
			const next: SortOrder = configStore.librarySort.order === 'asc' ? 'desc' : 'asc';
			configStore.setLibrarySort(configStore.librarySort.field, next);
		}}
	>
		{configStore.librarySort.order === 'asc' ? '↑' : '↓'}
	</button>
	<button
		type="button"
		class="rounded-[var(--ag-radius-sm)] border border-[var(--ag-border)] p-2 text-[var(--ag-text-muted)] transition-[background-color,color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)] hover:text-[var(--ag-text-primary)] {viewMode ===
		'grid'
			? 'bg-[var(--ag-surface-4)] text-[var(--ag-text-primary)]'
			: 'bg-[var(--ag-surface-3)]'}"
		aria-label="グリッド表示"
		onclick={() => {
			viewMode = 'grid';
		}}
	>
		<LayoutGrid class="h-4 w-4" />
	</button>
	<button
		type="button"
		class="rounded-[var(--ag-radius-sm)] border border-[var(--ag-border)] p-2 text-[var(--ag-text-muted)] transition-[background-color,color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)] hover:text-[var(--ag-text-primary)] {viewMode ===
		'list'
			? 'bg-[var(--ag-surface-4)] text-[var(--ag-text-primary)]'
			: 'bg-[var(--ag-surface-3)]'}"
		aria-label="リスト表示"
		onclick={() => {
			viewMode = 'list';
		}}
	>
		<LayoutList class="h-4 w-4" />
	</button>
	<button
		type="button"
		class="flex items-center gap-2 rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-4 py-3 text-sm text-[var(--ag-text-secondary)] transition-[background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)]"
		data-testid="add-item-button"
		onclick={() => onAddItem?.()}
	>
		<Plus class="h-4 w-4" />
		アイテムを追加
	</button>
	<button
		type="button"
		class="rounded-[var(--ag-radius-sm)] border border-[var(--ag-border)] p-2 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)] hover:text-[var(--ag-text-primary)] {selectionMode
			? 'bg-[var(--ag-accent-bg)] text-[var(--ag-accent-text)]'
			: 'bg-[var(--ag-surface-3)]'}"
		aria-label={selectionMode ? '選択モード終了' : '複数選択モード'}
		data-testid="library-selection-toggle"
		onclick={() => onSelectionToggle?.()}
	>
		{selectionMode ? '選択解除' : '複数選択'}
	</button>
</div>
