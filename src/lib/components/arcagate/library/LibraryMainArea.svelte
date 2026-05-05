<script lang="ts">
import {
	HelpCircle,
	LayoutGrid,
	LayoutList,
	Package,
	Plus,
	Search,
	X as XIcon,
} from '@lucide/svelte';
import StatCard from '$lib/components/arcagate/common/StatCard.svelte';
import EmptyState from '$lib/components/common/EmptyState.svelte';
import LoadingState from '$lib/components/common/LoadingState.svelte';
import { Button } from '$lib/components/ui/button';
import { bulkAddTag, bulkDeleteItems, getItemTags, searchItemsInTag } from '$lib/ipc/items';
import { launchItem } from '$lib/ipc/launch';
import { configStore } from '$lib/state/config.svelte';
import { helpStore } from '$lib/state/help.svelte';
import { itemStore } from '$lib/state/items.svelte';
import { libraryHistory } from '$lib/state/library-history.svelte';
import { metadataStore } from '$lib/state/metadata.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { fuzzyFilter } from '$lib/utils/fuzzy-search';
import { detectGridCols, type GridKeyAction, gridKeyboardNav } from '$lib/utils/grid-keyboard';
import { formatIpcError } from '$lib/utils/ipc-error';
import { formatLaunchError } from '$lib/utils/launch-error';
import {
	SORT_FIELD_LABELS,
	type SortField,
	type SortOrder,
	sortItems,
} from '$lib/utils/library-sort';
import LibraryCard from './LibraryCard.svelte';
import LibraryUndoSnackbar from './LibraryUndoSnackbar.svelte';

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
let searchInputEl = $state<HTMLInputElement | null>(null);
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
	// itemStore.items の変化（追加/削除/タグ更新）を検知して再フェッチ
	const _dep = itemStore.items;
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
// LibraryCard は metadataStore.getMetadata(id) で cache を読むだけ。
// S size / list view では LibraryCard が metadata 表示しないので fetch 不要。
$effect(() => {
	if (viewMode !== 'grid' || configStore.itemSize === 'S') return;
	const ids = filteredItems.map((i) => i.id);
	void metadataStore.loadMetadataForItems(ids);
});

// L2-B B1: keyboard nav (grid 矢印 / Enter / Esc / Space)。
// 純関数 gridKeyboardNav に delegate、focus 反映は data-testid で DOM lookup。
let activeCardIndex = $state(-1);
let gridContainerEl = $state<HTMLDivElement | null>(null);

// filteredItems が変わったら focus index を範囲内に補正 (delete / filter で範囲縮小時)。
// Codex L2-B #4: clamp 後に DOM focus も再適用しないと「削除された card に focus 残り
// keyboard nav が動作不能」になる。空になった場合は activeCardIndex=-1 にして fall-through。
$effect(() => {
	if (filteredItems.length === 0) {
		activeCardIndex = -1;
		return;
	}
	if (activeCardIndex >= filteredItems.length) {
		const next = filteredItems.length - 1;
		activeCardIndex = next;
		// DOM 反映後に focus 移動 (microtask タイミング)
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
	// Codex L2-B #1: tag 完全復元のため、削除前に tag id を取得して libraryHistory に記録する。
	// best-effort: tag 取得失敗でも本体削除は実施 (tag は失われるが UI は壊さない)。
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

function applyKeyAction(action: GridKeyAction) {
	switch (action.type) {
		case 'focus':
			focusCardAt(action.index);
			break;
		case 'launch': {
			const item = filteredItems[action.index];
			if (!item) return;
			void launchItem(item.id)
				.then(() => toastStore.add(`${item.label} を起動しました`, 'success'))
				.catch((e: unknown) => toastStore.add(formatLaunchError(item.label, e), 'error'));
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
	// IME / 入力 element 内では keyboard nav を奪わない
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
	// modifier 付きや長キー名 (ArrowUp 等) は除外。
	if (e.ctrlKey || e.metaKey || e.altKey) return;
	if (e.key.length !== 1) return;
	const prefix = e.key.toLowerCase();
	const idx = filteredItems.findIndex((i) => i.label.toLowerCase().startsWith(prefix));
	if (idx < 0) return;
	e.preventDefault();
	focusCardAt(idx);
}
</script>

<svelte:window
	onkeydown={(e) => {
		// L2-B B3: Ctrl/Cmd+F で search input にフォーカス (browser default の Find は dev tool 経由で代替)
		if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
			e.preventDefault();
			searchInputEl?.focus();
			searchInputEl?.select();
			return;
		}
		if (e.key === '/') {
			const target = e.target as HTMLElement;
			if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
				e.preventDefault();
				searchInputEl?.focus();
			}
		}
	}}
/>

<!-- R10-B G3 axe Phase 2: 外側 +page.svelte 側に <main> がある (nested main は axe critical)。
     ここは <section aria-label="ライブラリ"> に変更して landmark を保持する (section + aria-label で region role 付与)。 -->
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
	<!-- Search bar + sort chips -->
	<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
		<div
			class="flex min-w-0 flex-1 items-center gap-3 rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-4 py-3"
		>
			<Search class="h-5 w-5 text-[var(--ag-text-muted)]" />
			<input
				type="text"
				class="flex-1 bg-transparent text-sm text-[var(--ag-text-primary)] outline-none placeholder:text-[var(--ag-text-muted)]"
				placeholder="ライブラリを検索"
				autocomplete="off"
				bind:value={searchQuery}
				bind:this={searchInputEl}
			/>
			{#if searchQuery}
				<button
					type="button"
					class="rounded-full p-0.5 text-[var(--ag-text-muted)] transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)] hover:text-[var(--ag-text-primary)]"
					aria-label="検索をクリア"
					onclick={() => { searchQuery = ''; searchInputEl?.focus(); }}
				>
					<XIcon class="h-4 w-4" />
				</button>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			<!-- L2-C C1: sort dropdown (field + asc/desc)。debouncedQuery 入力中は fuzzy score 順が
			     優先されるため見た目上 disable 状態に。 -->
			<select
				class="rounded-[var(--ag-radius-sm)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2 py-1.5 text-xs text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] disabled:opacity-60"
				aria-label="並び順を選ぶ"
				data-testid="library-sort-field"
				disabled={debouncedQuery.trim().length > 0}
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
				disabled={debouncedQuery.trim().length > 0}
				onclick={() => {
					const next: SortOrder = configStore.librarySort.order === 'asc' ? 'desc' : 'asc';
					configStore.setLibrarySort(configStore.librarySort.field, next);
				}}
			>
				{configStore.librarySort.order === 'asc' ? '↑' : '↓'}
			</button>
			<button
				type="button"
				class="rounded-[var(--ag-radius-sm)] border border-[var(--ag-border)] p-2 text-[var(--ag-text-muted)] transition-[background-color,color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)] hover:text-[var(--ag-text-primary)] {viewMode === 'grid' ? 'bg-[var(--ag-surface-4)] text-[var(--ag-text-primary)]' : 'bg-[var(--ag-surface-3)]'}"
				aria-label="グリッド表示"
				onclick={() => { viewMode = 'grid'; }}
			>
				<LayoutGrid class="h-4 w-4" />
			</button>
			<button
				type="button"
				class="rounded-[var(--ag-radius-sm)] border border-[var(--ag-border)] p-2 text-[var(--ag-text-muted)] transition-[background-color,color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)] hover:text-[var(--ag-text-primary)] {viewMode === 'list' ? 'bg-[var(--ag-surface-4)] text-[var(--ag-text-primary)]' : 'bg-[var(--ag-surface-3)]'}"
				aria-label="リスト表示"
				onclick={() => { viewMode = 'list'; }}
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
				class="rounded-[var(--ag-radius-sm)] border border-[var(--ag-border)] p-2 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)] hover:text-[var(--ag-text-primary)] {selectionMode ? 'bg-[var(--ag-accent-bg)] text-[var(--ag-accent-text)]' : 'bg-[var(--ag-surface-3)]'}"
				aria-label={selectionMode ? '選択モード終了' : '複数選択モード'}
				data-testid="library-selection-toggle"
				onclick={() => {
					selectionMode = !selectionMode;
					if (!selectionMode) clearSelection();
				}}
			>
				{selectionMode ? '選択解除' : '複数選択'}
			</button>
		</div>
	</div>

	<!-- L3-B: 選択モード action bar を sticky top に変更 + JSON 書き出し追加 (Notion-like floating)。
	     scroll 中も visible を維持し、大量選択 + scroll での誤キャンセル等を防ぐ。 -->
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
			>削除</Button>
			<Button type="button" variant="outline" size="sm" onclick={exitSelectionMode}>
				キャンセル
			</Button>
		</div>
	{/if}

	<!-- Stat cards -->
	{#if itemStore.libraryStats}
		<div class="mb-4 grid grid-cols-2 lg:grid-cols-3 gap-3">
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
			onkeydown={handleGridKeydown}
		>
			{#each filteredItems as item (item.id)}
				<LibraryCard
					{item}
					{viewMode}
					isStarred={starredIds.has(item.id)}
					onclick={() => {
						if (selectionMode) toggleSelection(item.id);
						else onSelectItem?.(item.id);
					}}
					ondblclick={() => {
						void launchItem(item.id)
							.then(() => toastStore.add(`${item.label} を起動しました`, 'success'))
							.catch((e: unknown) =>
								toastStore.add(formatLaunchError(item.label, e), 'error'),
							);
					}}
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
			onkeydown={handleGridKeydown}
		>
			{#each filteredItems as item (item.id)}
				<LibraryCard
					{item}
					isStarred={starredIds.has(item.id)}
					onclick={() => {
						if (selectionMode) toggleSelection(item.id);
						else onSelectItem?.(item.id);
					}}
					ondblclick={() => {
						void launchItem(item.id)
							.then(() => toastStore.add(`${item.label} を起動しました`, 'success'))
							.catch((e: unknown) =>
								toastStore.add(formatLaunchError(item.label, e), 'error'),
							);
					}}
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
	</div>
</section>

<LibraryUndoSnackbar />
