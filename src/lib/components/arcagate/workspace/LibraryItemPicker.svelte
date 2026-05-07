<script lang="ts">
import { Search, Star } from '@lucide/svelte';
import { cubicOut } from 'svelte/easing';
import { fade, scale } from 'svelte/transition';
import LibraryCard from '$lib/components/arcagate/library/LibraryCard.svelte';
import { searchItemsInTag } from '$lib/ipc/items';
import { configStore } from '$lib/state/config.svelte';
import { itemStore } from '$lib/state/items.svelte';
import { metadataStore } from '$lib/state/metadata.svelte';
import type { Item, ItemType } from '$lib/types/item';

/**
 * ItemPicker (rebuild、user 「standard がずっとおかしい」を受けてスクラッチ再構築)。
 *
 * 旧版の問題点:
 * - starredIds 暫定 false 全件、お気に入り表示が完全に機能していなかった
 * - 検索のみ、filter / sort なし
 * - `.slice(0, 50)` で先頭 50 件固定、超過分は完全に見えない
 * - 大量 item で performance 劣化
 *
 * 新設計 (Library 画面 pattern を踏襲):
 * - 検索 (label / target / aliases、debounced 150ms)
 * - filter: item type (url/exe/script/folder/command) + starred only
 * - tag filter: user tag の chip toggle (将来追加可能、今は MVP に絞り system-starred filter のみ)
 * - sort: name asc/desc / 追加日 desc/asc
 * - pagination: 50/page、prev/next ナビ
 * - starred fix: cmd_search_items_in_tag('sys-starred') で正しく取得
 */
interface Props {
	onSelect: (item: Item) => void;
	onClose: () => void;
	multi?: boolean;
	onSelectMany?: (items: Item[]) => void;
}

let { onSelect, onClose, multi = false, onSelectMany }: Props = $props();

let selectedIds = $state<Set<string>>(new Set());
let searchQuery = $state('');
let debouncedQuery = $state('');
let filterType = $state<ItemType | 'all'>('all');
let starredOnly = $state(false);
type SortKey = 'name-asc' | 'name-desc' | 'created-desc' | 'created-asc';
let sortKey = $state<SortKey>('name-asc');
let page = $state(0);
const PAGE_SIZE = 50;

const rm =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;

// 150ms debounce
$effect(() => {
	const q = searchQuery;
	const timer = setTimeout(() => {
		debouncedQuery = q;
		page = 0; // 検索変更で 1 ページ目に戻す
	}, 150);
	return () => clearTimeout(timer);
});

// starredIds: sys-starred tag を IPC で取得 (旧実装の暫定 false 全件を fix)
let starredIds = $state<Set<string>>(new Set());
$effect(() => {
	const _dep = itemStore.items; // items 変化で再取得
	void _dep;
	searchItemsInTag('sys-starred', '')
		.then((items) => {
			starredIds = new Set(items.map((i) => i.id));
		})
		.catch(() => {
			// 失敗時は前回値維持
		});
});

function toggleSelected(id: string): void {
	const next = new Set(selectedIds);
	if (next.has(id)) next.delete(id);
	else next.add(id);
	selectedIds = next;
}

function confirmMulti(): void {
	if (!onSelectMany || selectedIds.size === 0) return;
	const items = filteredItems.filter((i) => selectedIds.has(i.id));
	if (items.length === 0) return;
	onSelectMany(items);
}

function clearFilters(): void {
	searchQuery = '';
	filterType = 'all';
	starredOnly = false;
	page = 0;
}

// filter + sort 適用済の全 item (pagination 前)。
let filteredItems = $derived.by(() => {
	let list = itemStore.items.filter((i) => i.is_enabled);

	// search
	if (debouncedQuery.trim()) {
		const q = debouncedQuery.toLowerCase();
		list = list.filter(
			(i) =>
				i.label.toLowerCase().includes(q) ||
				i.target.toLowerCase().includes(q) ||
				i.aliases.some((a) => a.toLowerCase().includes(q)),
		);
	}

	// type filter
	if (filterType !== 'all') {
		list = list.filter((i) => i.item_type === filterType);
	}

	// starred only
	if (starredOnly) {
		list = list.filter((i) => starredIds.has(i.id));
	}

	// sort
	const sorted = [...list];
	switch (sortKey) {
		case 'name-asc':
			sorted.sort((a, b) => a.label.localeCompare(b.label, 'ja'));
			break;
		case 'name-desc':
			sorted.sort((a, b) => b.label.localeCompare(a.label, 'ja'));
			break;
		case 'created-desc':
			sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
			break;
		case 'created-asc':
			sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
			break;
	}

	return sorted;
});

let totalPages = $derived(Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE)));
let pageItems = $derived(filteredItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE));

// 表示中 page の metadata を warm up (LibraryCard 内 cmd_get_item_metadata 並列呼び排除)
$effect(() => {
	if (configStore.itemSize === 'S') return;
	const ids = pageItems.map((i) => i.id);
	void metadataStore.loadMetadataForItems(ids);
});

const TYPE_LABELS: Record<ItemType | 'all', string> = {
	all: 'すべて',
	url: 'URL',
	exe: 'アプリ',
	script: 'スクリプト',
	folder: 'フォルダ',
	command: 'コマンド',
};
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
	onclick={(e) => {
		if (e.target === e.currentTarget) onClose();
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape') onClose();
	}}
>
	<div
		class="flex w-full max-w-4xl flex-col overflow-hidden rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] shadow-[var(--ag-shadow-dialog)]"
		style="max-height: 85vh;"
		transition:scale={{ duration: dNormal, start: 0.96, easing: cubicOut }}
	>
		<!-- 検索バー -->
		<div class="flex items-center gap-3 border-b border-[var(--ag-border)] px-4 py-3">
			<Search class="h-4 w-4 shrink-0 text-[var(--ag-text-muted)]" />
			<!-- svelte-ignore a11y_autofocus -->
			<input
				type="text"
				class="min-w-0 flex-1 bg-transparent text-sm text-[var(--ag-text-primary)] outline-none placeholder:text-[var(--ag-text-muted)]"
				placeholder="アイテムを検索 (label / target / 別名)"
				autofocus
				autocomplete="off"
				bind:value={searchQuery}
			/>
		</div>

		<!-- Filter / sort 行 -->
		<div
			class="flex flex-wrap items-center gap-2 border-b border-[var(--ag-border)] px-4 py-2.5 text-xs"
		>
			<!-- type filter -->
			<select
				class="rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2 py-1 text-xs text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
				bind:value={filterType}
				aria-label="種別で絞り込み"
			>
				{#each Object.entries(TYPE_LABELS) as [val, label] (val)}
					<option value={val}>{label}</option>
				{/each}
			</select>

			<!-- starred toggle -->
			<button
				type="button"
				class="flex items-center gap-1.5 rounded-md border px-2 py-1 transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {starredOnly
					? 'border-[var(--ag-accent)] bg-[var(--ag-accent-bg)] text-[var(--ag-accent-text)]'
					: 'border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]'}"
				aria-pressed={starredOnly}
				onclick={() => {
					starredOnly = !starredOnly;
					page = 0;
				}}
			>
				<Star class="h-3.5 w-3.5" fill={starredOnly ? 'currentColor' : 'none'} />
				<span>お気に入りのみ</span>
			</button>

			<!-- sort -->
			<select
				class="ml-auto rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2 py-1 text-xs text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
				bind:value={sortKey}
				aria-label="並び替え"
			>
				<option value="name-asc">名前 (昇順)</option>
				<option value="name-desc">名前 (降順)</option>
				<option value="created-desc">追加日 (新しい順)</option>
				<option value="created-asc">追加日 (古い順)</option>
			</select>

			<!-- 件数 + リセット -->
			<span class="text-[var(--ag-text-muted)]">
				{filteredItems.length} 件
			</span>
			{#if searchQuery || filterType !== 'all' || starredOnly}
				<button
					type="button"
					class="text-[var(--ag-text-muted)] underline hover:text-[var(--ag-text-primary)]"
					onclick={clearFilters}
				>
					絞り込み解除
				</button>
			{/if}
		</div>

		<!-- card grid -->
		<div class="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-gutter:stable]">
			{#if pageItems.length === 0}
				<div class="py-8 text-center text-sm text-[var(--ag-text-muted)]">
					{debouncedQuery || filterType !== 'all' || starredOnly
						? '一致するアイテムがありません'
						: 'アイテムがまだありません'}
				</div>
			{:else}
				<div
					class="grid"
					style="grid-template-columns: repeat(auto-fill, var(--ag-card-w, 192px)); gap: 1rem; justify-content: center;"
				>
					{#each pageItems as item (item.id)}
						{#if multi}
							<div class="relative">
								<input
									type="checkbox"
									class="pointer-events-none absolute left-2 top-2 z-10 h-4 w-4 cursor-pointer accent-[var(--ag-accent)]"
									checked={selectedIds.has(item.id)}
									aria-label="{item.label} を選択"
									tabindex="-1"
								/>
								<LibraryCard
									{item}
									isStarred={starredIds.has(item.id)}
									viewMode="grid"
									onclick={() => toggleSelected(item.id)}
									ondblclick={() => toggleSelected(item.id)}
								/>
							</div>
						{:else}
							<LibraryCard
								{item}
								isStarred={starredIds.has(item.id)}
								viewMode="grid"
								onclick={() => onSelect(item)}
								ondblclick={() => onSelect(item)}
							/>
						{/if}
					{/each}
				</div>
			{/if}
		</div>

		<!-- ページネーション + 確定 bar -->
		<div
			class="flex items-center justify-between gap-2 border-t border-[var(--ag-border)] bg-[var(--ag-surface-1)] px-4 py-3"
		>
			<div class="flex items-center gap-2 text-xs">
				<button
					type="button"
					class="rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2 py-1 text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] disabled:cursor-not-allowed disabled:opacity-40"
					disabled={page === 0}
					aria-label="前のページ"
					onclick={() => (page = Math.max(0, page - 1))}
				>
					‹ 前
				</button>
				<span class="tabular-nums text-[var(--ag-text-muted)]">
					{page + 1} / {totalPages}
				</span>
				<button
					type="button"
					class="rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2 py-1 text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] disabled:cursor-not-allowed disabled:opacity-40"
					disabled={page >= totalPages - 1}
					aria-label="次のページ"
					onclick={() => (page = Math.min(totalPages - 1, page + 1))}
				>
					次 ›
				</button>
			</div>

			<div class="flex items-center gap-2">
				<button
					type="button"
					class="rounded-md px-3 py-1.5 text-sm text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
					onclick={onClose}
				>
					キャンセル
				</button>
				{#if multi}
					<button
						type="button"
						class="rounded-md bg-[var(--ag-accent)] px-3 py-1.5 text-sm text-[var(--ag-accent-text)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none hover:bg-[var(--ag-accent-active-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] disabled:cursor-not-allowed disabled:opacity-50"
						data-testid="picker-confirm"
						disabled={selectedIds.size === 0}
						onclick={confirmMulti}
					>
						追加 ({selectedIds.size})
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>
