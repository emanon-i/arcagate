<script lang="ts">
import { Package, Plus, Search, X as XIcon } from '@lucide/svelte';
import { ask } from '@tauri-apps/plugin-dialog';
import StatCard from '$lib/components/arcagate/common/StatCard.svelte';
import { searchItemsInTag } from '$lib/ipc/items';
import { launchItem } from '$lib/ipc/launch';
import { itemStore } from '$lib/state/items.svelte';
import LibraryCard from './LibraryCard.svelte';

interface Props {
	activeTag: string | null;
	onSelectItem?: (id: string | null) => void;
	onAddItem?: () => void;
	onEditItem?: (id: string) => void;
}

let { activeTag, onSelectItem, onAddItem, onEditItem }: Props = $props();

async function handleDeleteItem(id: string) {
	const item = itemStore.items.find((i) => i.id === id);
	if (!item) return;
	const confirmed = await ask(`「${item.label}」を削除しますか？`, {
		title: '削除の確認',
		kind: 'warning',
	});
	if (confirmed) {
		void itemStore.deleteItem(id);
	}
}

let searchQuery = $state('');
let debouncedQuery = $state('');
let searchInputEl = $state<HTMLInputElement | null>(null);

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
	void itemStore.loadItemsByTag(activeTag, debouncedQuery).then(() => {
		if (myId !== currentRequestId) return; // stale レスポンスは無視
		localTagItems = itemStore.tagItems;
	});
});

// starred アイテム ID セット（LibraryCard の ★ バッジ表示用）
// itemStore.items を依存として宣言し、配列参照の変化（追加/削除/タグ更新）で自動再取得する
let starredIds = $state<Set<string>>(new Set());

$effect(() => {
	// itemStore.items の変化（追加/削除/タグ更新）を検知して再フェッチ
	const _dep = itemStore.items;
	void searchItemsInTag('sys-starred', '').then((items) => {
		starredIds = new Set(items.map((i) => i.id));
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
					class="rounded-full p-0.5 text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-4)] hover:text-[var(--ag-text-primary)]"
					aria-label="検索をクリア"
					onclick={() => { searchQuery = ''; searchInputEl?.focus(); }}
				>
					<XIcon class="h-4 w-4" />
				</button>
			{/if}
		</div>
		<button
			type="button"
			class="flex items-center gap-2 rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-4 py-3 text-sm text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]"
			data-testid="add-item-button"
			onclick={() => onAddItem?.()}
		>
			<Plus class="h-4 w-4" />
			アイテムを追加
		</button>
	</div>

	<!-- Stat cards -->
	{#if itemStore.libraryStats}
		<div class="mb-4 grid grid-cols-2 lg:grid-cols-3 gap-3">
			<StatCard label="総アイテム" value={itemStore.libraryStats.total_items} />
			<StatCard label="タグ" value={itemStore.libraryStats.total_tags} />
			<StatCard label="今週の起動" value={itemStore.libraryStats.recent_launch_count} />
		</div>
	{/if}

	<!-- Card grid -->
	{#if itemStore.loading && itemStore.items.length === 0}
		<div class="flex items-center justify-center py-20">
			<span class="mr-2 inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--ag-accent)] border-t-transparent"></span>
			<span class="text-sm text-[var(--ag-text-muted)]">読み込み中...</span>
		</div>
	{:else}
		<div class="grid gap-4 [&>*]:max-w-sm" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">
			{#each filteredItems as item (item.id)}
				<LibraryCard
					{item}
					isStarred={starredIds.has(item.id)}
					onclick={() => onSelectItem?.(item.id)}
					ondblclick={() => void launchItem(item.id)}
				/>
			{/each}
			{#if filteredItems.length === 0}
				{#if !searchQuery && !activeTag && itemStore.items.length === 0}
					<!-- 真の空状態：初回体験ガイド -->
					<div class="col-span-full flex flex-col items-center justify-center gap-4 py-16">
						<div class="rounded-full bg-[var(--ag-surface-4)] p-4">
							<Package class="h-8 w-8 text-[var(--ag-text-muted)]" />
						</div>
						<div class="text-center">
							<p class="text-sm font-medium text-[var(--ag-text-primary)]">ライブラリが空です</p>
							<p class="mt-1 text-xs text-[var(--ag-text-muted)]">
								アプリ・フォルダ・URL などのショートカットを追加できます
							</p>
						</div>
						<button
							type="button"
							class="flex items-center gap-2 rounded-[var(--ag-radius-card)] bg-[var(--ag-accent)] px-4 py-2 text-sm text-white hover:opacity-90"
							onclick={() => onAddItem?.()}
						>
							<Plus class="h-4 w-4" />
							アイテムを追加
						</button>
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
