<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { bulkAddTag, bulkDeleteItems, getItemTags, searchItemsInTag } from '$lib/ipc/items';
import { launchItem } from '$lib/ipc/launch';
import { configStore } from '$lib/state/config.svelte';
import { itemStore } from '$lib/state/items.svelte';
import { libraryHistory } from '$lib/state/library-history.svelte';
import { metadataStore } from '$lib/state/metadata.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { fuzzyFilter } from '$lib/utils/fuzzy-search';
import { detectGridCols, type GridKeyAction, gridKeyboardNav } from '$lib/utils/grid-keyboard';
import { formatIpcError } from '$lib/utils/ipc-error';
import { formatLaunchError } from '$lib/utils/launch-error';
import { sortItems } from '$lib/utils/library-sort';
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
		toastStore.add(`${count} 件をお気に入りに追加しました`, 'success');
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: '一括お気に入り追加' }, e), 'error');
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
		toastStore.add(`${items.length} 件を JSON で clipboard にコピーしました`, 'success');
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: 'JSON書き出し' }, e), 'error');
	}
}

async function handleBulkDelete() {
	if (selectedIds.size === 0) return;
	if (!window.confirm(`${selectedIds.size} 件を削除しますか? (元に戻せません)`)) return;
	try {
		const ids = Array.from(selectedIds);
		const count = await bulkDeleteItems(ids);
		toastStore.add(`${count} 件を削除しました`, 'success');
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: '一括削除' }, e), 'error');
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
	searchItemsInTag('sys-starred', '')
		.then((items) => {
			starredIds = new Set(items.map((i) => i.id));
		})
		.catch(() => {
			// best-effort、失敗時は前回の値を維持
		});
});

// L2-C C1+C4+C6: source = activeTag 中なら tagItems、そうでなければ全 items。
// debouncedQuery で fuzzy filter (label / target / aliases 横断、score 降順)。
// query 無しなら configStore.librarySort で並べ替え。
let filteredItems = $derived.by(() => {
	const source = activeTag ? localTagItems : itemStore.items;
	if (debouncedQuery.trim().length > 0) {
		return fuzzyFilter(source, debouncedQuery, (i) => [i.label, i.target, ...i.aliases]);
	}
	return sortItems(source, configStore.librarySort);
});

// I3 fix: per-card $effect 並列呼び出しを排除し、visible items を 1 batch で warm up。
$effect(() => {
	if (viewMode !== 'grid' || configStore.itemSize === 'S') return;
	const ids = filteredItems.map((i) => i.id);
	void metadataStore.loadMetadataForItems(ids);
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
	void launchItem(item.id)
		.then(() => toastStore.add(`${item.label} を起動しました`, 'success'))
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
<section aria-label="ライブラリ" class="min-h-full">
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
				<span class="text-[var(--ag-accent-text)]">{selectedIds.size} 件選択中</span>
				<div class="flex-1"></div>
				<Button type="button" variant="default" size="sm" onclick={() => void handleBulkStar()}>
					お気に入りに追加
				</Button>
				<Button type="button" variant="outline" size="sm" onclick={() => void handleBulkExport()}>
					JSON で書き出す
				</Button>
				<Button
					type="button"
					variant="destructive"
					size="sm"
					onclick={() => void handleBulkDelete()}
				>
					削除
				</Button>
				<Button type="button" variant="outline" size="sm" onclick={exitSelectionMode}>
					キャンセル
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
		/>
	</div>
</section>

<LibraryUndoSnackbar />
