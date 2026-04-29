<script lang="ts">
/**
 * PH-issue-027 / 検収項目 #21: ItemWidget 専用 Settings dialog content。
 *
 * 旧実装は CommonMaxItemsSettings を使っていたため
 * 関係ない max_items / sort_field を表示する壊れた状態だった。
 * 本 component で「現在のアイテム表示 + 変更 / 解除」に置換。
 *
 * 引用元 guideline:
 * - docs/desktop_ui_ux_agent_rules.md P3 主要 vs 補助 / P4 一貫性
 * - docs/l1_requirements/ux_standards.md §6-3 Settings dialog
 * - CLAUDE.md「設定変えたら即見た目が変わる、遅延反映は欠陥」
 */
import { Package, X } from '@lucide/svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import LibraryItemPicker from '$lib/components/arcagate/workspace/LibraryItemPicker.svelte';
import { Button } from '$lib/components/ui/button';
import { itemStore } from '$lib/state/items.svelte';
import type { Item } from '$lib/types/item';

interface Props {
	config: { item_id?: string | null };
}

let { config = $bindable() }: Props = $props();

let pickerOpen = $state(false);

let pinnedItem = $derived(
	config.item_id ? (itemStore.items.find((i) => i.id === config.item_id) ?? null) : null,
);

function selectItem(item: Item) {
	pickerOpen = false;
	config = { ...config, item_id: item.id };
}

function clearItem() {
	config = { ...config, item_id: null };
}
</script>

<div class="space-y-2">
	<p class="text-sm font-medium text-[var(--ag-text-primary)]">紐付いたアイテム</p>
	{#if pinnedItem}
		<div class="flex items-center gap-3 rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2">
			<ItemIcon
				iconPath={pinnedItem.icon_path}
				itemType={pinnedItem.item_type}
				alt="{pinnedItem.label} icon"
				class="h-8 w-8 shrink-0 object-contain"
			/>
			<div class="min-w-0 flex-1">
				<p class="truncate text-sm font-medium text-[var(--ag-text-primary)]">{pinnedItem.label}</p>
				<p class="truncate font-mono text-xs text-[var(--ag-text-muted)]">{pinnedItem.target}</p>
			</div>
		</div>
	{:else}
		<div class="rounded-[var(--ag-radius-input)] border border-dashed border-[var(--ag-border)] px-3 py-3 text-center">
			<Package class="mx-auto h-5 w-5 text-[var(--ag-text-faint)]" />
			<p class="mt-1 text-xs text-[var(--ag-text-muted)]">アイテム未選択</p>
		</div>
	{/if}
</div>

<div class="flex items-center gap-2">
	<Button type="button" variant="default" size="sm" onclick={() => (pickerOpen = true)}>
		{pinnedItem ? 'アイテムを変更' : 'アイテムを選択'}
	</Button>
	{#if pinnedItem}
		<Button type="button" variant="outline" size="sm" onclick={clearItem}>
			<X class="h-3.5 w-3.5" />
			解除
		</Button>
	{/if}
</div>

{#if pickerOpen}
	<LibraryItemPicker onSelect={selectItem} onClose={() => (pickerOpen = false)} />
{/if}
