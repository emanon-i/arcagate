<script lang="ts">
import { Clock3 } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import { launchItem } from '$lib/ipc/launch';
import { getRecentItems } from '$lib/ipc/workspace';
import { configStore } from '$lib/state/config.svelte';
import { hiddenStore } from '$lib/state/hidden.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import type { Item } from '$lib/types/item';
import { LIST_WIDGET_DEFAULTS } from '$lib/types/widget-configs';
import type { WorkspaceWidget } from '$lib/types/workspace';
import { parseWidgetConfig } from '$lib/utils/widget-config';
import WidgetItemList from '$lib/components/arcagate/workspace/WidgetItemList.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';

interface Props {
	widget?: WorkspaceWidget;
	onItemContext?: (itemId: string) => void;
}

let { widget, onItemContext }: Props = $props();

let recentItems = $state<Item[]>([]);
let settingsOpen = $state(false);

$effect(() => {
	const { max_items: limit } = parseWidgetConfig(widget?.config, LIST_WIDGET_DEFAULTS);
	void getRecentItems(limit).then((items) => {
		recentItems = items;
	});
});

let visibleRecentItems = $derived(
	hiddenStore.isHiddenVisible ? recentItems : recentItems.filter((i) => i.is_enabled),
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
	const item = recentItems.find((i) => i.id === id);
	await launchItem(id)
		.then(() => toastStore.add(`${item?.label ?? id} を起動しました`, 'success'))
		.catch((e: unknown) => toastStore.add(`起動に失敗しました: ${String(e)}`, 'error'));
}
</script>

<WidgetShell title="Recent launches" icon={Clock3} {menuItems}>
	<WidgetItemList
		items={visibleRecentItems}
		{sortField}
		iconClass={widgetIconClass}
		showTarget
		onLaunch={handleLaunch}
		onContext={onItemContext}
		emptyMessage="最近の起動履歴がここに表示されます"
	/>
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => { settingsOpen = false; }} />
{/if}
