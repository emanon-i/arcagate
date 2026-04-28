<script lang="ts">
import { Search } from '@lucide/svelte';
import { cubicOut } from 'svelte/easing';
import { fade, scale } from 'svelte/transition';
import LibraryCard from '$lib/components/arcagate/library/LibraryCard.svelte';
import { itemStore } from '$lib/state/items.svelte';
import type { Item } from '$lib/types/item';

/**
 * PH-issue-005: アイテム Picker = LibraryCard 再利用版。
 *
 * 引用元 guideline:
 * - docs/desktop_ui_ux_agent_rules.md P4 (同じ意味のものは同じように扱う) / P12 整合性
 * - docs/l1_requirements/ux_standards.md §6-3 Dialog / §11 アイテムカードサイズ
 * - CLAUDE.md「同じ機能 = 同じ icon + 同じラベル」
 *
 * 複数選択 / sort / filter は別 plan (PH-issue-005 の続編 or PH-issue-011)。
 * 本 PR は「LibraryCard 再利用 + 単一選択」までの最小スコープ。
 */
interface Props {
	onSelect: (item: Item) => void;
	onClose: () => void;
}

let { onSelect, onClose }: Props = $props();

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
						<LibraryCard
							{item}
							isStarred={starredIds.has(item.id)}
							viewMode="grid"
							onclick={() => onSelect(item)}
							ondblclick={() => onSelect(item)}
						/>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
