<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';
import { bulkAddTag, bulkDeleteItems, getItemTags, searchItemsInTag } from '$lib/ipc/items';
import { configStore } from '$lib/state/config.svelte';
import { itemStore } from '$lib/state/items.svelte';
import { libraryHistory } from '$lib/state/library-history.svelte';
import { metadataStore } from '$lib/state/metadata.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { fuzzyFilter } from '$lib/utils/fuzzy-search';
import { detectGridCols, type GridKeyAction, gridKeyboardNav } from '$lib/utils/grid-keyboard';
import { tPlural } from '$lib/utils/intl-formatter.svelte';
import { formatIpcError } from '$lib/utils/ipc-error';
import { launchItemWithCascade } from '$lib/utils/launch-cascade';
import { formatLaunchError } from '$lib/utils/launch-error';
import { sortItems } from '$lib/utils/library-sort';
import { markEnd, markStart, PERF_LABELS } from '$lib/utils/perf';
import { tl } from '$lib/utils/perf-timeline';
import LibrarySearchBar from './LibrarySearchBar.svelte';
import LibrarySortControls from './LibrarySortControls.svelte';
import LibraryUndoSnackbar from './LibraryUndoSnackbar.svelte';
import LibraryView from './LibraryView.svelte';

/**
 * Library main area facade。
 *
 * 引用元 guideline:
 *   docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、595 LOC を facade + 3 sub に分割)
 *
 * 子 component:
 * - LibrarySearchBar (search input + Ctrl+F focus)
 * - LibrarySortControls (sort field / order / view mode / add / selection toggle)
 * - LibraryView (card grid/list + Stat cards + EmptyState)
 * - LibraryUndoSnackbar (既存)
 *
 * 本 facade は state orchestration:
 * - searchQuery / debouncedQuery + 150ms debounce
 * - viewMode / selectionMode / selectedIds + bulk handlers
 * - localTagItems (request token race protection)
 * - starredIds (LibraryCard ★ badge)
 * - filteredItems (fuzzyFilter / sortItems)
 * - metadata warm-up
 * - keyboard nav (activeCardIndex / handleGridKeydown / applyKeyAction / focusCardAt)
 */
interface Props {
	activeTag: string | null;
	onSelectItem?: (id: string | null) => void;
	onAddItem?: () => void;
	/** L2-B B2: F3 で focus 中 item の編集 dialog を開く。 */
	onEditItem?: (id: string) => void;
}

let { activeTag, onSelectItem, onAddItem, onEditItem }: Props = $props();

tl('LibraryMainArea: instantiate');

let searchQuery = $state('');
let debouncedQuery = $state('');
let viewMode = $state<'grid' | 'list'>('grid');

// PH-436: 複数選択モード (Nielsen H7)
let selectionMode = $state(false);
let selectedIds = $state<Set<string>>(new Set());

function toggleSelection(id: string) {
	const next = new Set(selectedIds);
	if (next.has(id)) next.delete(id);
	else next.add(id);
	selectedIds = next;
}

function clearSelection() {
	selectedIds = new Set();
}

function exitSelectionMode() {
	selectionMode = false;
	clearSelection();
}

function handleSelectionToggle() {
	selectionMode = !selectionMode;
	if (!selectionMode) clearSelection();
}

async function handleBulkStar() {
	if (selectedIds.size === 0) return;
	try {
		const ids = Array.from(selectedIds);
		const count = await bulkAddTag(ids, 'sys-starred');
		toastStore.add(tPlural('toast.favorites_added_n', count), 'success');
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: t('library.op.bulk_star') }, e), 'error');
		return;
	}
	// mutation 成功後の post-refresh は best-effort (allSettled)。失敗で selection を抜けないと
	// confused UX (mutation 済んでるのに選択モード残る) になるため finally 相当で必ず exit。
	await Promise.allSettled([
		itemStore.loadItems(),
		itemStore.loadLibraryStats(),
		itemStore.loadTagWithCounts(),
	]);
	exitSelectionMode();
}

async function handleBulkExport() {
	if (selectedIds.size === 0) return;
	// 選択中 item を JSON 配列で clipboard へコピー (workspace import / 他端末送信用)。
	const ids = Array.from(selectedIds);
	const items = itemStore.items.filter((i) => ids.includes(i.id));
	try {
		await navigator.clipboard.writeText(JSON.stringify(items, null, 2));
		toastStore.add(tPlural('toast.json_copied_n', items.length), 'success');
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: t('library.op.json_export') }, e), 'error');
	}
}

async function handleBulkDelete() {
	if (selectedIds.size === 0) return;
	if (!window.confirm(tPlural('library.selection.delete_confirm', selectedIds.size))) return;
	try {
		const ids = Array.from(selectedIds);
		const count = await bulkDeleteItems(ids);
		toastStore.add(tPlural('toast.items_deleted_n', count), 'success');
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: t('library.op.bulk_delete') }, e), 'error');
		return;
	}
	await Promise.allSettled([
		itemStore.loadItems(),
		itemStore.loadLibraryStats(),
		itemStore.loadTagWithCounts(),
	]);
	exitSelectionMode();
}

// 150ms デバウンス: キーストロークごとの IPC を抑制
$effect(() => {
	const q = searchQuery;
	const timer = setTimeout(() => {
		debouncedQuery = q;
	}, 150);
	return () => clearTimeout(timer);
});

// request ID 方式で race condition を防止:
// activeTag / debouncedQuery が高速変化したとき、古い IPC レスポンスで上書きしない
let localTagItems = $state<import('$lib/types/item').Item[]>([]);
let currentRequestId = 0;

$effect(() => {
	if (!activeTag) return;
	const myId = ++currentRequestId;
	itemStore
		.loadItemsByTag(activeTag, debouncedQuery)
		.then(() => {
			if (myId !== currentRequestId) return; // stale レスポンスは無視
			localTagItems = itemStore.tagItems;
		})
		.catch(() => {
			if (myId === currentRequestId) localTagItems = [];
		});
});

// starred アイテム ID セット（LibraryCard の ★ バッジ表示用）
// itemStore.items を依存として宣言し、配列参照の変化（追加/削除/タグ更新）で自動再取得する
let starredIds = $state<Set<string>>(new Set());

$effect(() => {
	const _dep = itemStore.items;
	void _dep;
	// L-batch (2026-05-10 user 検収 perf 計測): cold start で items=[] (初期値) →
	// loadItems 完了で items=[N] の 2 段階で本 $effect が 2 回発火し、starred IPC が
	// 2 回発射されていた (cold で +44-64ms の余計な IPC、特に Library 初期表示で体感)。
	// 0 件で fetch しても結果は空 → IPC を skip。
	if (itemStore.items.length === 0) {
		if (starredIds.size > 0) starredIds = new Set();
		return;
	}
	markStart(PERF_LABELS.libraryStarredFetch);
	tl('starred fetch: cmd_search_items_in_tag(sys-starred) invoke', { thread: 'bg' });
	searchItemsInTag('sys-starred', '')
		.then((items) => {
			starredIds = new Set(items.map((i) => i.id));
		})
		.catch(() => {
			// best-effort、失敗時は前回の値を維持
		})
		.finally(() => {
			tl('starred fetch: done');
			const dur = markEnd(PERF_LABELS.libraryStarredFetch);
			if (dur !== null && dur > 100) {
				console.warn(`[perf] starred fetch ${dur.toFixed(1)}ms (items=${itemStore.items.length})`);
			}
		});
});

// L2-C C1+C4+C6: source = activeTag 中なら tagItems、そうでなければ全 items。
// debouncedQuery で fuzzy filter (label / target / aliases 横断、score 降順)。
// query 無しなら configStore.librarySort で並べ替え。
// F-1 (2026-05-08 user 検収): configStore.libraryShowHidden = false なら is_enabled=false
// アイテムを除外。toggle で表示切替可能 (LibrarySortControls 経由)。
let filteredItems = $derived.by(() => {
	markStart(PERF_LABELS.libraryFilteredItemsCompute);
	tl('filteredItems compute: start (sort/filter)');
	const rawSource = activeTag ? localTagItems : itemStore.items;
	const source = configStore.libraryShowHidden ? rawSource : rawSource.filter((i) => i.is_enabled);
	let result: import('$lib/types/item').Item[];
	if (debouncedQuery.trim().length > 0) {
		result = fuzzyFilter(source, debouncedQuery, (i) => [i.label, i.target, ...i.aliases]);
	} else {
		result = sortItems(source, configStore.librarySort);
	}
	tl('filteredItems compute: end', { note: `result=${result.length}` });
	const dur = markEnd(PERF_LABELS.libraryFilteredItemsCompute);
	if (dur !== null && dur > 30) {
		console.warn(
			`[perf] filteredItems compute ${dur.toFixed(1)}ms (source=${source.length}, query='${debouncedQuery}', result=${result.length})`,
		);
	}
	return result;
});

// I3 fix: per-card $effect 並列呼び出しを排除し、visible items を 1 batch で warm up。
$effect(() => {
	if (viewMode !== 'grid' || configStore.itemSize === 'S') return;
	const ids = filteredItems.map((i) => i.id);
	markStart(PERF_LABELS.libraryMetadataWarmup);
	tl('metadata warmup: cmd_get_items_metadata_batch invoke', {
		thread: 'bg',
		note: `${ids.length} ids`,
	});
	void metadataStore.loadMetadataForItems(ids).finally(() => {
		tl('metadata warmup: done');
		const dur = markEnd(PERF_LABELS.libraryMetadataWarmup);
		if (dur !== null && dur > 100) {
			console.warn(`[perf] metadata warmup ${dur.toFixed(1)}ms (n=${ids.length})`);
		}
	});
});

// L2-B B1: keyboard nav (grid 矢印 / Enter / Esc / Space)。
let activeCardIndex = $state(-1);
let gridContainerEl = $state<HTMLDivElement | null>(null);

// filteredItems が変わったら focus index を範囲内に補正 (delete / filter で範囲縮小時)。
$effect(() => {
	if (filteredItems.length === 0) {
		activeCardIndex = -1;
		return;
	}
	if (activeCardIndex >= filteredItems.length) {
		const next = filteredItems.length - 1;
		activeCardIndex = next;
		queueMicrotask(() => focusCardAt(next));
	}
});

function focusCardAt(index: number) {
	if (index < 0 || index >= filteredItems.length) return;
	activeCardIndex = index;
	const id = filteredItems[index].id;
	const el = gridContainerEl?.querySelector<HTMLElement>(`[data-testid="library-card-${id}"]`);
	el?.focus();
}

async function deleteWithUndo(item: import('$lib/types/item').Item) {
	let tagIds: string[] = [];
	try {
		const tags = await getItemTags(item.id);
		tagIds = tags.map((t) => t.id);
	} catch {
		// tag 取得 IPC 失敗時は空で続行
	}
	await itemStore.deleteItem(item.id);
	libraryHistory.recordDelete(item, tagIds);
}

function handleLaunch(item: import('$lib/types/item').Item) {
	// C-15 #10 + #19: card_override.opener_id があれば opener 経由起動、無ければ既存 cmd_launch_item。
	void launchItemWithCascade(item)
		.then(() => toastStore.add(t('toast.launched_label', { label: item.label }), 'success'))
		.catch((e: unknown) => toastStore.add(formatLaunchError(item.label, e), 'error'));
}

function applyKeyAction(action: GridKeyAction) {
	switch (action.type) {
		case 'focus':
			focusCardAt(action.index);
			break;
		case 'launch': {
			const item = filteredItems[action.index];
			if (!item) return;
			handleLaunch(item);
			break;
		}
		case 'toggleSelect': {
			const item = filteredItems[action.index];
			if (item) toggleSelection(item.id);
			break;
		}
		case 'edit': {
			const item = filteredItems[action.index];
			if (item) onEditItem?.(item.id);
			break;
		}
		case 'delete': {
			const item = filteredItems[action.index];
			if (item) void deleteWithUndo(item);
			break;
		}
		case 'selectAll':
			selectionMode = true;
			selectedIds = new Set(filteredItems.map((i) => i.id));
			break;
		case 'dismiss':
			activeCardIndex = -1;
			onSelectItem?.(null);
			(document.activeElement as HTMLElement | null)?.blur();
			break;
		case 'noop':
			break;
	}
}

function handleGridKeydown(e: KeyboardEvent) {
	if (e.isComposing) return;
	const target = e.target as HTMLElement | null;
	if (
		target &&
		(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
	) {
		return;
	}
	const cols = viewMode === 'grid' ? detectGridCols(gridContainerEl) : 1;
	const action = gridKeyboardNav({
		key: e.key,
		currentIndex: activeCardIndex,
		total: filteredItems.length,
		cols,
		selectionMode,
		mod: e.ctrlKey || e.metaKey,
	});
	if (action.type !== 'noop') {
		e.preventDefault();
		applyKeyAction(action);
		return;
	}
	// L2-B B3: type-to-jump — gridKeyboardNav が拾わなかった単 printable は
	// 先頭一致 (case-insensitive、locale-aware) で item を jump。
	if (e.ctrlKey || e.metaKey || e.altKey) return;
	if (e.key.length !== 1) return;
	const prefix = e.key.toLowerCase();
	const idx = filteredItems.findIndex((i) => i.label.toLowerCase().startsWith(prefix));
	if (idx < 0) return;
	e.preventDefault();
	focusCardAt(idx);
}
</script>

<!-- R10-B G3 axe Phase 2: 外側 +page.svelte 側に <main> がある (nested main は axe critical)。
     ここは <section aria-label="ライブラリ"> に変更して landmark を保持する。 -->
<section aria-label={t('library.section_aria')} class="min-h-full">
	<div
		class="min-h-full p-5"
		role="presentation"
		tabindex="-1"
		onclick={(e: MouseEvent) => {
			if (!(e.target as HTMLElement).closest('[data-testid^="library-card-"]')) {
				onSelectItem?.(null);
			}
		}}
		onkeydown={(e: KeyboardEvent) => {
			if (e.key === 'Escape') onSelectItem?.(null);
		}}
	>
		<!-- Search bar + sort/view/add/selection chips -->
		<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
			<LibrarySearchBar bind:value={searchQuery} />
			<LibrarySortControls
				bind:viewMode
				bind:selectionMode
				searchActive={debouncedQuery.trim().length > 0}
				{onAddItem}
				onSelectionToggle={handleSelectionToggle}
			/>
		</div>

		<!-- L3-B: 選択モード action bar を sticky top に変更 + JSON 書き出し追加 (Notion-like floating)。 -->
		{#if selectionMode && selectedIds.size > 0}
			<div
				class="sticky top-0 z-10 mb-4 flex items-center gap-2 rounded-[var(--ag-radius-card)] border border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] px-4 py-2 text-sm shadow-[var(--ag-shadow-md)]"
				data-testid="library-selection-actionbar"
			>
				<span class="text-[var(--ag-accent-text)]">{t('library.selection.count', { count: selectedIds.size })}</span>
				<div class="flex-1"></div>
				<Button type="button" variant="default" size="sm" onclick={() => void handleBulkStar()}>
					{t('library.selection.add_favorites')}
				</Button>
				<Button type="button" variant="outline" size="sm" onclick={() => void handleBulkExport()}>
					{t('library.selection.export_json')}
				</Button>
				<Button
					type="button"
					variant="destructive"
					size="sm"
					onclick={() => void handleBulkDelete()}
				>
					{t('common.delete')}
				</Button>
				<Button type="button" variant="outline" size="sm" onclick={exitSelectionMode}>
					{t('common.cancel')}
				</Button>
			</div>
		{/if}

		<LibraryView
			{filteredItems}
			{starredIds}
			{selectedIds}
			{viewMode}
			{selectionMode}
			{searchQuery}
			{activeTag}
			bind:gridContainerEl
			{onSelectItem}
			onLaunch={handleLaunch}
			onToggleSelection={toggleSelection}
			{onAddItem}
			onGridKeydown={handleGridKeydown}
			{onEditItem}
		/>
	</div>
</section>

<LibraryUndoSnackbar />
