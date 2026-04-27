<script lang="ts">
import { Package, Pencil } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import LibraryCard from '$lib/components/arcagate/library/LibraryCard.svelte';
import LibraryItemPicker from '$lib/components/arcagate/workspace/LibraryItemPicker.svelte';
import { launchItem } from '$lib/ipc/launch';
import { updateWidgetConfig } from '$lib/ipc/workspace';
import { itemStore } from '$lib/state/items.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import type { Item } from '$lib/types/item';
import { ITEM_WIDGET_DEFAULTS, type ItemWidgetConfig } from '$lib/types/widget-configs';
import { WIDGET_LABELS, type WorkspaceWidget } from '$lib/types/workspace';
import { formatIpcError } from '$lib/utils/ipc-error';
import { formatLaunchError } from '$lib/utils/launch-error';
import { parseWidgetConfig } from '$lib/utils/widget-config';

interface Props {
	widget?: WorkspaceWidget;
	onItemContext?: (itemId: string) => void;
}

let { widget, onItemContext }: Props = $props();

let pickerOpen = $state(false);

let config = $derived(parseWidgetConfig(widget?.config, ITEM_WIDGET_DEFAULTS) as ItemWidgetConfig);

// PH-474: item_ids (新) > item_id (旧、後方互換) の優先順
let pinnedIds = $derived.by<string[]>(() => {
	if (config.item_ids && config.item_ids.length > 0) return config.item_ids;
	if (config.item_id) return [config.item_id];
	return [];
});

let pinnedItems = $derived(
	pinnedIds.map((id) => itemStore.items.find((i) => i.id === id)).filter((i): i is Item => !!i),
);

async function persistSelection(items: Item[]) {
	pickerOpen = false;
	if (!widget) return;
	try {
		const next: ItemWidgetConfig = {
			item_id: items.length === 1 ? items[0].id : null,
			item_ids: items.length > 1 ? items.map((i) => i.id) : [],
		};
		await updateWidgetConfig(widget.id, JSON.stringify(next));
		await itemStore.loadItems();
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: '設定の保存' }, e), 'error');
	}
}

function singleSelect(item: Item) {
	void persistSelection([item]);
}

function multiConfirm(items: Item[]) {
	void persistSelection(items);
}

let menuItems = $derived(
	widget
		? [
				{
					label: 'アイテムを変更',
					onclick: () => {
						pickerOpen = true;
					},
				},
			]
		: [],
);

function handleLaunch(item: Item) {
	void launchItem(item.id)
		.then(() => toastStore.add(`${item.label} を起動しました`, 'success'))
		.catch((e: unknown) => toastStore.add(formatLaunchError(item.label, e), 'error'));
}

function handleContext(itemId: string) {
	if (onItemContext) onItemContext(itemId);
}
</script>

<WidgetShell
	title={pinnedItems.length === 1 ? pinnedItems[0].label : WIDGET_LABELS.item}
	icon={Package}
	{menuItems}
>
	{#if pinnedItems.length > 1}
		<!-- 複数アイテム: LibraryCard grid 表示 (PH-474) -->
		<div
			class="grid gap-2"
			style="grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));"
		>
			{#each pinnedItems as item (item.id)}
				<div
					class="relative"
					oncontextmenu={(e) => {
						e.preventDefault();
						handleContext(item.id);
					}}
					role="presentation"
				>
					<LibraryCard {item} viewMode="grid" onclick={() => handleLaunch(item)} />
				</div>
			{/each}
		</div>
	{:else if pinnedItems.length === 1}
		{@const item = pinnedItems[0]}
		<LibraryCard {item} viewMode="grid" onclick={() => handleLaunch(item)} />
	{:else}
		<button
			type="button"
			class="flex w-full flex-col items-center justify-center gap-2 rounded-[var(--ag-radius-card)] border border-dashed border-[var(--ag-border)] py-8 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] hover:border-[var(--ag-accent)] hover:text-[var(--ag-accent-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
			onclick={() => {
				pickerOpen = true;
			}}
		>
			<Pencil class="h-6 w-6" />
			<span class="text-xs">アイテムを選択</span>
		</button>
	{/if}
</WidgetShell>

{#if pickerOpen}
	<LibraryItemPicker
		multi={true}
		initialSelectedIds={pinnedIds}
		onConfirm={multiConfirm}
		onSelect={singleSelect}
		onClose={() => {
			pickerOpen = false;
		}}
	/>
{/if}
