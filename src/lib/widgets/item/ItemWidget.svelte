<script lang="ts">
import { Package, Pencil } from '@lucide/svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import LibraryItemPicker from '$lib/components/arcagate/workspace/LibraryItemPicker.svelte';
import { launchItem } from '$lib/ipc/launch';
import { updateWidgetConfig } from '$lib/ipc/workspace';
import { itemStore } from '$lib/state/items.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import type { Item } from '$lib/types/item';
import { ITEM_WIDGET_DEFAULTS } from '$lib/types/widget-configs';
import { WIDGET_LABELS, type WorkspaceWidget } from '$lib/types/workspace';
import { formatLaunchError } from '$lib/utils/launch-error';
import { parseWidgetConfig } from '$lib/utils/widget-config';

interface Props {
	widget?: WorkspaceWidget;
	onItemContext?: (itemId: string) => void;
}

let { widget, onItemContext }: Props = $props();

let pickerOpen = $state(false);

let itemId = $derived(parseWidgetConfig(widget?.config, ITEM_WIDGET_DEFAULTS).item_id);

let pinnedItem = $derived(itemId ? (itemStore.items.find((i) => i.id === itemId) ?? null) : null);

async function selectItem(item: Item) {
	pickerOpen = false;
	if (!widget) return;
	try {
		await updateWidgetConfig(widget.id, JSON.stringify({ item_id: item.id }));
		await itemStore.loadItems();
	} catch (e: unknown) {
		toastStore.add(`設定の保存に失敗しました: ${String(e)}`, 'error');
	}
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
</script>

<WidgetShell title={pinnedItem?.label ?? WIDGET_LABELS.item} icon={Package} {menuItems}>
	{#if pinnedItem}
		<button
			type="button"
			class="flex w-full flex-col items-center gap-3 rounded-[var(--ag-radius-card)] p-4 transition-[background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)]"
			onclick={() => {
				void launchItem(pinnedItem!.id)
					.then(() => toastStore.add(`${pinnedItem!.label} を起動しました`, 'success'))
					.catch((e: unknown) =>
						toastStore.add(formatLaunchError(pinnedItem!.label, e), 'error'),
					);
			}}
			oncontextmenu={(e) => {
				if (onItemContext && pinnedItem) {
					e.preventDefault();
					onItemContext(pinnedItem.id);
				}
			}}
		>
			<div class="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--ag-border)] bg-[var(--ag-surface-3)]">
				<ItemIcon iconPath={pinnedItem.icon_path} itemType={pinnedItem.item_type} alt="{pinnedItem.label} icon" class="h-10 w-10 object-contain" />
			</div>
			<span class="line-clamp-2 text-center text-sm font-medium text-[var(--ag-text-primary)]">{pinnedItem.label}</span>
		</button>
	{:else}
		<button
			type="button"
			class="flex w-full flex-col items-center justify-center gap-2 rounded-[var(--ag-radius-card)] border border-dashed border-[var(--ag-border)] py-8 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] hover:border-[var(--ag-accent)] hover:text-[var(--ag-accent-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
			onclick={() => { pickerOpen = true; }}
		>
			<Pencil class="h-6 w-6" />
			<span class="text-xs">アイテムを選択</span>
		</button>
	{/if}
</WidgetShell>

{#if pickerOpen}
	<LibraryItemPicker onSelect={selectItem} onClose={() => { pickerOpen = false; }} />
{/if}
