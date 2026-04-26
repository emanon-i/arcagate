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
import { searchItemsInTag } from '$lib/ipc/items';
import { launchItem } from '$lib/ipc/launch';
import { configStore } from '$lib/state/config.svelte';
import { helpStore } from '$lib/state/help.svelte';
import { itemStore } from '$lib/state/items.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { formatLaunchError } from '$lib/utils/launch-error';
import LibraryCard from './LibraryCard.svelte';

interface Props {
	activeTag: string | null;
	onSelectItem?: (id: string | null) => void;
	onAddItem?: () => void;
}

let { activeTag, onSelectItem, onAddItem }: Props = $props();

let searchQuery = $state('');
let debouncedQuery = $state('');
let searchInputEl = $state<HTMLInputElement | null>(null);
let viewMode = $state<'grid' | 'list'>('grid');

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

let filteredItems = $derived.by(() => {
	if (activeTag) {
		return localTagItems;
	}
	if (searchQuery) {
		const q = searchQuery.toLowerCase();
		return itemStore.items.filter((item) => item.label.toLowerCase().includes(q));
	}
	return itemStore.items;
});
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === '/') {
			const target = e.target as HTMLElement;
			if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
				e.preventDefault();
				searchInputEl?.focus();
			}
		}
	}}
/>

<main class="min-h-full">
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
		</div>
	</div>

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
		<div class="overflow-hidden rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] divide-y divide-[var(--ag-border)]">
			{#each filteredItems as item (item.id)}
				<LibraryCard
					{item}
					{viewMode}
					isStarred={starredIds.has(item.id)}
					onclick={() => onSelectItem?.(item.id)}
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
		<div
			class="library-grid grid"
			style="grid-template-columns: repeat(auto-fill, var(--ag-card-w)); gap: var(--ag-card-gap); justify-content: center; --ag-card-w: var(--ag-card-w-{configStore.itemSize.toLowerCase()});"
		>
			{#each filteredItems as item (item.id)}
				<LibraryCard
					{item}
					isStarred={starredIds.has(item.id)}
					onclick={() => onSelectItem?.(item.id)}
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
</main>
