<script lang="ts">
import { Search, Star } from '@lucide/svelte';
import LibraryCard from '$lib/components/arcagate/library/LibraryCard.svelte';
import { getSizeClasses } from '$lib/components/arcagate/library/library-card-sizes';
import BaseDialog from '$lib/components/common/BaseDialog.svelte';
import { t } from '$lib/i18n.svelte';
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

// audit 2026-05-14 G1: BaseDialog 経由に migration、 transition / motion-reduce / Escape / backdrop
// 全て BaseDialog 内蔵。 disableFocusTrap=true で search input 常時 focus 維持 contract 保持。

// 150ms debounce
$effect(() => {
	const q = searchQuery;
	const timer = setTimeout(() => {
		debouncedQuery = q;
		page = 0; // 検索変更で 1 ページ目に戻す
	}, 150);
	return () => clearTimeout(timer);
});

// Phase L-3: itemSize 共通の class を 1 回 derive、全 card に props 配布。
let sizeClasses = $derived(getSizeClasses(configStore.itemSize));

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

function getTypeLabels(): Record<ItemType | 'all', string> {
	return {
		all: t('workspace.picker.type_all'),
		url: 'URL',
		exe: t('workspace.picker.type_exe'),
		script: t('workspace.picker.type_script'),
		folder: t('workspace.picker.type_folder'),
		command: t('workspace.picker.type_command'),
	};
}
</script>

<!-- audit 2026-05-14 G1: BaseDialog migration、 disableFocusTrap=true で search input 常時 focus 維持。
     size="xl" の max-w-xl を boxClass で max-w-4xl に override、 max-h 85vh + p-0 で 3-pane layout。 -->
<BaseDialog
	open={true}
	{onClose}
	size="xl"
	disableFocusTrap={true}
	ariaLabelledby="picker-title"
	boxClass="!max-w-4xl !p-0 flex flex-col overflow-hidden max-h-[85vh]"
>
	<div class="flex flex-1 flex-col overflow-hidden" id="picker-title" aria-label={t('workspace.picker.aria_label')}>
		<!-- 検索バー -->
		<div class="flex items-center gap-3 border-b border-[var(--ag-border)] px-4 py-3">
			<Search class="h-4 w-4 shrink-0 text-[var(--ag-text-muted)]" />
			<!-- svelte-ignore a11y_autofocus -->
			<input
				type="text"
				class="min-w-0 flex-1 bg-transparent text-sm text-[var(--ag-text-primary)] outline-none placeholder:text-[var(--ag-text-muted)]"
				placeholder={t('workspace.picker.search_placeholder')}
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
				aria-label={t('workspace.picker.filter_type_aria')}
			>
				{#each Object.entries(getTypeLabels()) as [val, label] (val)}
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
				<span>{t('workspace.picker.starred_only')}</span>
			</button>

			<!-- sort -->
			<select
				class="ml-auto rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2 py-1 text-xs text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
				bind:value={sortKey}
				aria-label={t('workspace.picker.sort_aria')}
			>
				<option value="name-asc">{t('workspace.picker.sort_name_asc')}</option>
				<option value="name-desc">{t('workspace.picker.sort_name_desc')}</option>
				<option value="created-desc">{t('workspace.picker.sort_created_desc')}</option>
				<option value="created-asc">{t('workspace.picker.sort_created_asc')}</option>
			</select>

			<!-- 件数 + リセット -->
			<span class="text-[var(--ag-text-muted)]">
				{t('workspace.picker.count', { n: filteredItems.length })}
			</span>
			{#if searchQuery || filterType !== 'all' || starredOnly}
				<button
					type="button"
					class="text-[var(--ag-text-muted)] underline hover:text-[var(--ag-text-primary)]"
					onclick={clearFilters}
				>
					{t('workspace.picker.clear_filters')}
				</button>
			{/if}
		</div>

		<!-- card grid -->
		<div class="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-gutter:stable]">
			{#if pageItems.length === 0}
				<div class="py-8 text-center text-sm text-[var(--ag-text-muted)]">
					{debouncedQuery || filterType !== 'all' || starredOnly
						? t('workspace.picker.no_match')
						: t('workspace.picker.no_items')}
				</div>
			{:else}
				<!-- F-7 (2026-05-08 user 検収): LibraryView と同様 --ag-card-w を inline で設定。
				     旧実装は var(--ag-card-w, 192px) でフォールバック頼みだったが、子 LibraryCard 側
				     `width: var(--ag-card-w)` が未定義 fallback なしで card width 不足の表示崩れに。 -->
				<div
					class="grid"
					style="grid-template-columns: repeat(auto-fill, var(--ag-card-w)); gap: 1rem; justify-content: center; --ag-card-w: var(--ag-card-w-{configStore.itemSize.toLowerCase()});"
				>
					{#each pageItems as item (item.id)}
						{#if multi}
							<!-- G-1 (2026-05-09 user 検収): checkbox を右下に移動。
							     左上はカード icon / お気に入り星と被って視認性が悪い。右下なら
							     カード操作と独立して見やすい。背景に半透明 surface-opaque で contrast 担保。 -->
							<div class="relative">
								<LibraryCard
									{item}
									{sizeClasses}
									isStarred={starredIds.has(item.id)}
									viewMode="grid"
									onclick={() => toggleSelected(item.id)}
									ondblclick={() => toggleSelected(item.id)}
								/>
								<input
									type="checkbox"
									class="pointer-events-none absolute bottom-2 right-2 z-10 h-4 w-4 cursor-pointer rounded border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] accent-[var(--ag-accent)] shadow-[var(--ag-shadow-sm)]"
									checked={selectedIds.has(item.id)}
									aria-label={t('workspace.picker.select_item', { label: item.label })}
									tabindex="-1"
								/>
							</div>
						{:else}
							<LibraryCard
								{item}
								{sizeClasses}
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
					aria-label={t('workspace.picker.prev_page')}
					onclick={() => (page = Math.max(0, page - 1))}
				>
					‹ {t('common.back')}
				</button>
				<span class="tabular-nums text-[var(--ag-text-muted)]">
					{page + 1} / {totalPages}
				</span>
				<button
					type="button"
					class="rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2 py-1 text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] disabled:cursor-not-allowed disabled:opacity-40"
					disabled={page >= totalPages - 1}
					aria-label={t('workspace.picker.next_page')}
					onclick={() => (page = Math.min(totalPages - 1, page + 1))}
				>
					{t('common.next')} ›
				</button>
			</div>

			<div class="flex items-center gap-2">
				<button
					type="button"
					class="rounded-md px-3 py-1.5 text-sm text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
					onclick={onClose}
				>
					{t('common.cancel')}
				</button>
				{#if multi}
					<button
						type="button"
						class="rounded-md bg-[var(--ag-accent)] px-3 py-1.5 text-sm text-[var(--ag-accent-text)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none hover:bg-[var(--ag-accent-active-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] disabled:cursor-not-allowed disabled:opacity-50"
						data-testid="picker-confirm"
						disabled={selectedIds.size === 0}
						onclick={confirmMulti}
					>
						{t('workspace.picker.add_n', { count: selectedIds.size })}
					</button>
				{/if}
			</div>
		</div>
	</div>
</BaseDialog>
