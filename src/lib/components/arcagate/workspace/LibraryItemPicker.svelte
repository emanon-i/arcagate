<script lang="ts">
import { Check, Search, X } from '@lucide/svelte';
import { cubicOut } from 'svelte/easing';
import { fade, scale } from 'svelte/transition';
import LibraryCard from '$lib/components/arcagate/library/LibraryCard.svelte';
import { itemStore } from '$lib/state/items.svelte';
import type { Item } from '$lib/types/item';

interface Props {
	/** 単一選択 callback (multi=false 時) */
	onSelect?: (item: Item) => void;
	/** 複数選択 callback (multi=true 時、確定ボタン押下時のみ呼ばれる) */
	onConfirm?: (items: Item[]) => void;
	onClose: () => void;
	multi?: boolean;
	/** 既選択 id 集合 (multi=true で初期チェック状態) */
	initialSelectedIds?: string[];
}

let { onSelect, onConfirm, onClose, multi = false, initialSelectedIds = [] }: Props = $props();

let searchQuery = $state('');
let debouncedQuery = $state('');
let selectedIds = $state<Set<string>>(new Set(initialSelectedIds));
let sortBy = $state<'default' | 'name' | 'recent'>('default');

const rm =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;

$effect(() => {
	const q = searchQuery;
	const timer = setTimeout(() => {
		debouncedQuery = q;
	}, 150);
	return () => clearTimeout(timer);
});

let filteredItems = $derived.by(() => {
	let items = itemStore.items.slice();
	if (debouncedQuery.trim()) {
		const q = debouncedQuery.toLowerCase();
		items = items.filter((i) => i.label.toLowerCase().includes(q));
	}
	if (sortBy === 'name') {
		items.sort((a, b) => a.label.localeCompare(b.label));
	} else if (sortBy === 'recent') {
		items.sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''));
	}
	return items.slice(0, 200);
});

function toggleSelect(item: Item) {
	if (multi) {
		const next = new Set(selectedIds);
		if (next.has(item.id)) {
			next.delete(item.id);
		} else {
			next.add(item.id);
		}
		selectedIds = next;
	} else {
		onSelect?.(item);
	}
}

function confirmSelection() {
	const picked = filteredItems.filter((i) => selectedIds.has(i.id));
	// 既選択でフィルタ外も含める
	const allItems = itemStore.items.filter((i) => selectedIds.has(i.id));
	const merged = Array.from(new Map([...picked, ...allItems].map((i) => [i.id, i])).values());
	onConfirm?.(merged);
}
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
		<!-- Header: search + sort + close -->
		<div class="flex items-center gap-3 border-b border-[var(--ag-border)] px-4 py-3">
			<Search class="h-4 w-4 shrink-0 text-[var(--ag-text-muted)]" />
			<!-- svelte-ignore a11y_autofocus -->
			<input
				type="text"
				class="min-w-0 flex-1 bg-transparent text-sm text-[var(--ag-text-primary)] outline-none placeholder:text-[var(--ag-text-muted)]"
				placeholder="アイテムを検索..."
				autofocus
				autocomplete="off"
				bind:value={searchQuery}
			/>
			<select
				class="shrink-0 rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2 py-1 text-xs text-[var(--ag-text-secondary)]"
				aria-label="並び順"
				bind:value={sortBy}
			>
				<option value="default">登録順</option>
				<option value="name">名前順</option>
				<option value="recent">更新順</option>
			</select>
			<button
				type="button"
				class="shrink-0 rounded-full p-1 text-[var(--ag-text-muted)] transition-colors hover:bg-[var(--ag-surface-3)]"
				aria-label="ピッカーを閉じる"
				onclick={onClose}
			>
				<X class="h-4 w-4" />
			</button>
		</div>

		<!-- Library card grid -->
		<!-- HOTFIX: --ag-card-w を 100% で override
			(LibraryMainArea でのみ --ag-card-w が定義されており、picker 内の LibraryCard で
			 width: var(--ag-card-w) が空文字 → aspect-[4/3] が height 0 計算で潰れる問題の修正) -->
		<div
			class="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-gutter:stable]"
			style="--ag-card-w: 100%;"
		>
			{#if filteredItems.length === 0}
				<div class="py-12 text-center text-sm text-[var(--ag-text-muted)]">
					{debouncedQuery ? '一致するアイテムがありません' : 'アイテムがまだありません'}
				</div>
			{:else}
				<div
					class="grid gap-3"
					style="grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));"
				>
					{#each filteredItems as item (item.id)}
						{@const isSel = selectedIds.has(item.id)}
						<div class="relative">
							<LibraryCard {item} viewMode="grid" onclick={() => toggleSelect(item)} />
							{#if multi}
								<!-- 選択チェック overlay (右上) -->
								<div
									class="pointer-events-none absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors {isSel
										? 'border-[var(--ag-accent)] bg-[var(--ag-accent)] text-white'
										: 'border-white/60 bg-black/30'}"
									aria-hidden="true"
								>
									{#if isSel}
										<Check class="h-3.5 w-3.5" />
									{/if}
								</div>
								<!-- 選択 ring overlay -->
								{#if isSel}
									<div
										class="pointer-events-none absolute inset-0 rounded-[var(--ag-radius-card)] ring-2 ring-[var(--ag-accent)] ring-offset-2 ring-offset-[var(--ag-surface-opaque)]"
									></div>
								{/if}
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Footer (multi mode のみ): 選択数 + 確定 -->
		{#if multi}
			<div class="flex items-center justify-between border-t border-[var(--ag-border)] px-4 py-3">
				<span class="text-sm text-[var(--ag-text-muted)]">
					{selectedIds.size} 件選択中
				</span>
				<div class="flex items-center gap-2">
					<button
						type="button"
						class="rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-1.5 text-sm text-[var(--ag-text-secondary)] transition-colors hover:bg-[var(--ag-surface-4)]"
						onclick={onClose}
					>
						キャンセル
					</button>
					<button
						type="button"
						class="rounded-md bg-[var(--ag-accent)] px-3 py-1.5 text-sm font-medium text-[var(--ag-accent-text)] transition-opacity hover:opacity-90 disabled:opacity-50"
						disabled={selectedIds.size === 0}
						onclick={confirmSelection}
					>
						{selectedIds.size} 件を追加
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
