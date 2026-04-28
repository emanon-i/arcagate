<script lang="ts">
import { Star } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetItemList from '$lib/components/arcagate/workspace/WidgetItemList.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import { searchItemsInTag } from '$lib/ipc/items';
import { launchItem } from '$lib/ipc/launch';
import { configStore } from '$lib/state/config.svelte';
import { hiddenStore } from '$lib/state/hidden.svelte';
import { itemStore } from '$lib/state/items.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import type { Item } from '$lib/types/item';
import { LIST_WIDGET_DEFAULTS } from '$lib/types/widget-configs';
import { WIDGET_LABELS, type WorkspaceWidget } from '$lib/types/workspace';
import { formatLaunchError } from '$lib/utils/launch-error';
import { parseWidgetConfig } from '$lib/utils/widget-config';

interface Props {
	widget?: WorkspaceWidget;
	onItemContext?: (itemId: string, ev?: MouseEvent) => void;
}

let { widget, onItemContext }: Props = $props();

let favorites = $state<Item[]>([]);
let settingsOpen = $state(false);

$effect(() => {
	const _dep = itemStore.items;
	const { max_items: limit } = parseWidgetConfig(widget?.config, LIST_WIDGET_DEFAULTS);
	void searchItemsInTag('sys-starred', '').then((items) => {
		favorites = items.slice(0, limit);
	});
});

let visibleFavorites = $derived(
	hiddenStore.isHiddenVisible ? favorites : favorites.filter((i) => i.is_enabled),
);

let sortField = $derived(parseWidgetConfig(widget?.config, LIST_WIDGET_DEFAULTS).sort_field);

let widgetIconClass = $derived(
	configStore.itemSize === 'S'
		? 'h-4 w-4 shrink-0 object-cover'
		: configStore.itemSize === 'L'
			? 'h-6 w-6 shrink-0 object-cover'
			: 'h-5 w-5 shrink-0 object-cover',
);

let menuItems = $derived(
	widget
		? [
				{
					label: '設定',
					onclick: () => {
						settingsOpen = true;
					},
				},
			]
		: [],
);

async function handleLaunch(id: string) {
	const item = favorites.find((i) => i.id === id);
	await launchItem(id)
		.then(() => toastStore.add(`${item?.label ?? id} を起動しました`, 'success'))
		.catch((e: unknown) => toastStore.add(formatLaunchError(item?.label ?? id, e), 'error'));
}
</script>

<WidgetShell title={WIDGET_LABELS.favorites} icon={Star} {menuItems}>
	<WidgetItemList
		items={visibleFavorites}
		{sortField}
		iconClass={widgetIconClass}
		onLaunch={handleLaunch}
		onContext={onItemContext}
		emptyMessage="★ のついたアイテムがここに表示されます"
	/>
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => { settingsOpen = false; }} />
{/if}
