<script lang="ts">
import { Search } from '@lucide/svelte';
import { cubicOut } from 'svelte/easing';
import { fade, scale } from 'svelte/transition';
import LibraryCard from '$lib/components/arcagate/library/LibraryCard.svelte';
import { itemStore } from '$lib/state/items.svelte';
import type { Item } from '$lib/types/item';

/**
 * PH-issue-005: アイテム Picker = LibraryCard 再利用版。
 * PH-issue-025: 複数選択モード追加 (multi=true で checkbox + 下部 confirm bar)。
 *
 * 引用元 guideline:
 * - docs/desktop_ui_ux_agent_rules.md P3 主要 vs 補助 / P4 一貫性 / P10 熟練者効率
 * - docs/l1_requirements/ux_standards.md §6-3 Dialog (multi-select pattern) / §11 アイテムカードサイズ
 * - CLAUDE.md「同じ機能 = 同じ icon + 同じラベル」
 */
interface Props {
	onSelect: (item: Item) => void;
	onClose: () => void;
	/** PH-issue-025: 複数選択モード。true で checkbox + 下部 confirm bar を出す。 */
	multi?: boolean;
	/** multi=true 時、複数選択確定で呼ばれる (1 件以上)。 */
	onSelectMany?: (items: Item[]) => void;
}

let { onSelect, onClose, multi = false, onSelectMany }: Props = $props();
let selectedIds = $state<Set<string>>(new Set());

function toggleSelected(id: string) {
	const next = new Set(selectedIds);
	if (next.has(id)) next.delete(id);
	else next.add(id);
	selectedIds = next;
}

function confirmMulti() {
	if (!onSelectMany || selectedIds.size === 0) return;
	const items = filteredItems.filter((i) => selectedIds.has(i.id));
	if (items.length === 0) return;
	onSelectMany(items);
}

const SYS_STARRED_ID = 'sys-starred';

let searchQuery = $state('');
let debouncedQuery = $state('');

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
	const visible = itemStore.items.filter((i) => i.is_enabled);
	if (!debouncedQuery.trim()) return visible.slice(0, 50);
	const q = debouncedQuery.toLowerCase();
	return visible.filter((i) => i.label.toLowerCase().includes(q)).slice(0, 50);
});

// PH-issue-005: お気に入り状態を Library と同じ source (sys-starred タグ) で判定。
let starredIds = $derived(
	new Set(
		itemStore.items
			.filter(
				(_i) => false, // 暫定: itemStore に星情報なし、別途取得が必要
			)
			.map((i) => i.id),
	),
);
// items の既存メタには star 情報がないため、Library と同じく getItemTags 経由が必要。
// 本 PR では絞らず、LibraryCard の isStarred を全 false で渡す (見た目の整合は維持、お気に入り表示は Library 専用)。
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
		class="flex w-full max-w-3xl flex-col overflow-hidden rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] shadow-[var(--ag-shadow-dialog)]"
		style="max-height: 80vh;"
		transition:scale={{ duration: dNormal, start: 0.96, easing: cubicOut }}
	>
		<!-- Search bar -->
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
		</div>
		<!-- Library と同じ grid layout で LibraryCard を再利用 -->
		<div class="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-gutter:stable]">
			{#if filteredItems.length === 0}
				<div class="py-8 text-center text-sm text-[var(--ag-text-muted)]">
					{debouncedQuery ? '一致するアイテムがありません' : 'アイテムがまだありません'}
				</div>
			{:else}
				<div
					class="grid"
					style="grid-template-columns: repeat(auto-fill, var(--ag-card-w, 192px)); gap: 1rem; justify-content: center;"
				>
					{#each filteredItems as item (item.id)}
						{#if multi}
							<!-- PH-issue-025: multi-select モード。card click で toggle、checkbox overlay 表示。 -->
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
		<!-- PH-issue-025: multi-select 確定 bar。multi=false の時は描画しない。 -->
		{#if multi}
			<div
				class="flex items-center justify-end gap-2 border-t border-[var(--ag-border)] bg-[var(--ag-surface-1)] px-4 py-3"
				data-testid="picker-confirm-bar"
			>
				<button
					type="button"
					class="rounded-md px-3 py-1.5 text-sm text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
					onclick={onClose}
				>キャンセル</button>
				<button
					type="button"
					class="rounded-md bg-[var(--ag-accent)] px-3 py-1.5 text-sm text-[var(--ag-accent-text)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none hover:bg-[var(--ag-accent-active-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] disabled:cursor-not-allowed disabled:opacity-50"
					data-testid="picker-confirm"
					disabled={selectedIds.size === 0}
					onclick={confirmMulti}
				>追加 ({selectedIds.size})</button>
			</div>
		{/if}
	</div>
</div>
