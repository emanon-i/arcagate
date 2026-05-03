<script lang="ts">
/**
 * 5/03 user 検収 (C): ItemWidget collection support。
 *
 * 旧実装: 単一 `item_id` のみ、画像 1 個だけの片寄った機能。
 * 新実装: `item_ids[]` (複数) + sort_field (manual / name / recent) + view_mode は widget 側 toolbar。
 *  legacy `item_id` も読んで [item_id] に変換、後方互換。
 */
import { Package, Plus, X } from '@lucide/svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import LibraryItemPicker from '$lib/components/arcagate/workspace/LibraryItemPicker.svelte';
import { Button } from '$lib/components/ui/button';
import { itemStore } from '$lib/state/items.svelte';
import type { Item } from '$lib/types/item';

interface Props {
	config: {
		item_id?: string | null;
		item_ids?: string[];
		view_mode?: 'grid' | 'list';
		sort_field?: 'manual' | 'name' | 'recent';
	};
}

let { config = $bindable() }: Props = $props();

let pickerOpen = $state(false);

// legacy item_id → [item_id] 後方互換 + 編集中の collection 配列。
let itemIds = $derived.by<string[]>(() => {
	if (config.item_ids && config.item_ids.length > 0) return config.item_ids;
	if (config.item_id) return [config.item_id];
	return [];
});

let sortField = $derived<'manual' | 'name' | 'recent'>(config.sort_field ?? 'manual');

let pinnedItems = $derived.by<Item[]>(() =>
	itemIds
		.map((id) => itemStore.items.find((i) => i.id === id))
		.filter((i): i is Item => i !== undefined),
);

function selectMany(items: Item[]) {
	pickerOpen = false;
	if (items.length === 0) return;
	// 既存 item_ids に追加 (重複は除外)、legacy item_id は item_ids に統合。
	const existing = new Set(itemIds);
	const next = [...itemIds];
	for (const it of items) {
		if (!existing.has(it.id)) next.push(it.id);
	}
	config = { ...config, item_ids: next, item_id: null };
}

function selectSingle(item: Item) {
	pickerOpen = false;
	const existing = new Set(itemIds);
	if (existing.has(item.id)) return;
	config = { ...config, item_ids: [...itemIds, item.id], item_id: null };
}

function removeAt(index: number) {
	const next = [...itemIds];
	next.splice(index, 1);
	config = { ...config, item_ids: next, item_id: null };
}

function moveUp(index: number) {
	if (index <= 0) return;
	const next = [...itemIds];
	[next[index - 1], next[index]] = [next[index], next[index - 1]];
	config = { ...config, item_ids: next, item_id: null };
}

function moveDown(index: number) {
	if (index >= itemIds.length - 1) return;
	const next = [...itemIds];
	[next[index], next[index + 1]] = [next[index + 1], next[index]];
	config = { ...config, item_ids: next, item_id: null };
}

function clearAll() {
	config = { ...config, item_ids: [], item_id: null };
}

function setSort(value: 'manual' | 'name' | 'recent') {
	config = { ...config, sort_field: value };
}
</script>

<div class="space-y-2">
	<div class="flex items-center justify-between">
		<p class="text-sm font-medium text-[var(--ag-text-primary)]">
			紐付いたアイテム ({pinnedItems.length} 件)
		</p>
		{#if pinnedItems.length > 0}
			<Button type="button" variant="outline" size="sm" onclick={clearAll}>
				<X class="h-3.5 w-3.5" />
				全解除
			</Button>
		{/if}
	</div>
	{#if pinnedItems.length === 0}
		<div
			class="rounded-[var(--ag-radius-input)] border border-dashed border-[var(--ag-border)] px-3 py-3 text-center"
		>
			<Package class="mx-auto h-5 w-5 text-[var(--ag-text-faint)]" />
			<p class="mt-1 text-xs text-[var(--ag-text-muted)]">アイテム未選択</p>
		</div>
	{:else}
		<ul class="space-y-1">
			{#each pinnedItems as item, index (item.id)}
				<li
					class="flex items-center gap-2 rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2 py-1.5"
				>
					<ItemIcon
						iconPath={item.icon_path}
						itemType={item.item_type}
						alt="{item.label} icon"
						class="h-6 w-6 shrink-0 object-contain"
					/>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium text-[var(--ag-text-primary)]">{item.label}</p>
						<p class="truncate font-mono text-xs text-[var(--ag-text-muted)]">{item.target}</p>
					</div>
					{#if sortField === 'manual' && pinnedItems.length > 1}
						<button
							type="button"
							class="rounded p-0.5 text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
							aria-label="{item.label} を上に移動"
							disabled={index === 0}
							onclick={() => moveUp(index)}
						>↑</button>
						<button
							type="button"
							class="rounded p-0.5 text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
							aria-label="{item.label} を下に移動"
							disabled={index === pinnedItems.length - 1}
							onclick={() => moveDown(index)}
						>↓</button>
					{/if}
					<button
						type="button"
						class="rounded p-0.5 text-[var(--ag-text-muted)] hover:bg-[var(--ag-error-bg)] hover:text-[var(--ag-error-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-error-border)]"
						aria-label="{item.label} を解除"
						onclick={() => removeAt(index)}
					>
						<X class="h-3.5 w-3.5" />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<div class="flex items-center gap-2">
	<Button type="button" variant="default" size="sm" onclick={() => (pickerOpen = true)}>
		<Plus class="h-3.5 w-3.5" />
		アイテムを追加
	</Button>
</div>

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-item-sort">並び順</label>
	<select
		id="ws-item-sort"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={sortField}
		onchange={(e) => setSort((e.currentTarget as HTMLSelectElement).value as 'manual' | 'name' | 'recent')}
	>
		<option value="manual">手動 (↑↓ で並べ替え)</option>
		<option value="name">名前順 (昇順)</option>
		<option value="recent">最近起動した順 (将来対応)</option>
	</select>
</div>

{#if pickerOpen}
	<LibraryItemPicker
		multi={true}
		onSelect={selectSingle}
		onSelectMany={selectMany}
		onClose={() => (pickerOpen = false)}
	/>
{/if}
