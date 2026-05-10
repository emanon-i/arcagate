<script lang="ts">
import { Clock3 } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetItemList from '$lib/components/arcagate/workspace/WidgetItemList.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import { launchItem } from '$lib/ipc/launch';
import { getRecentItems } from '$lib/ipc/workspace';
import { configStore } from '$lib/state/config.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { workspaceContextMenuStore } from '$lib/state/workspace-context-menu.svelte';
import type { Item } from '$lib/types/item';
import { LIST_WIDGET_DEFAULTS } from '$lib/types/widget-configs';
import { WIDGET_LABELS, type WorkspaceWidget } from '$lib/types/workspace';
import { formatLaunchError } from '$lib/utils/launch-error';
import { parseWidgetConfig } from '$lib/utils/widget-config';
import { widgetMenuItems } from '../_shared/menu-items';

interface Props {
	widget?: WorkspaceWidget;
	onItemContext?: (itemId: string, ev?: MouseEvent) => void;
}

let { widget }: Props = $props();

let recentItems = $state<Item[]>([]);
let settingsOpen = $state(false);

$effect(() => {
	const { max_items: limit } = parseWidgetConfig(widget?.config, LIST_WIDGET_DEFAULTS);
	void getRecentItems(limit).then((items) => {
		recentItems = items;
	});
});

// H-1: 非表示 (is_enabled=false) のアイテムは widget でも常に除外 (hiddenStore 削除に伴う簡素化)。
let visibleRecentItems = $derived(recentItems.filter((i) => i.is_enabled));

let sortField = $derived(parseWidgetConfig(widget?.config, LIST_WIDGET_DEFAULTS).sort_field);

let widgetIconClass = $derived(
	configStore.itemSize === 'S'
		? 'h-4 w-4 shrink-0 object-cover'
		: configStore.itemSize === 'L'
			? 'h-6 w-6 shrink-0 object-cover'
			: 'h-5 w-5 shrink-0 object-cover',
);

let menuItems = $derived(widgetMenuItems(widget, () => (settingsOpen = true)));

async function handleLaunch(id: string) {
	const item = recentItems.find((i) => i.id === id);
	await launchItem(id)
		.then(() => toastStore.add(`${item?.label ?? id} を起動しました`, 'success'))
		.catch((e: unknown) => toastStore.add(formatLaunchError(item?.label ?? id, e), 'error'));
}

/** I-2: item-row 右 click → 共通 context menu。 */
function handleItemContext(id: string, ev?: MouseEvent): void {
	const item = recentItems.find((i) => i.id === id);
	if (!item) return;
	ev?.preventDefault();
	ev?.stopPropagation();
	workspaceContextMenuStore.openMenuFor({
		itemId: item.id,
		path: item.target,
		widgetId: widget?.id ?? null,
		onOpenSettings: () => (settingsOpen = true),
		ev,
	});
}
</script>

<WidgetShell title={WIDGET_LABELS.recent} icon={Clock3} {menuItems}>
	<WidgetItemList
		items={visibleRecentItems}
		{sortField}
		iconClass={widgetIconClass}
		showTarget
		onLaunch={handleLaunch}
		onContext={handleItemContext}
		emptyMessage="最近の起動履歴がここに表示されます"
	/>
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => { settingsOpen = false; }} />
{/if}
