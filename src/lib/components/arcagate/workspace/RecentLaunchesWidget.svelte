<script lang="ts">
import { Clock3 } from '@lucide/svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import { launchItem } from '$lib/ipc/launch';
import { getRecentItems } from '$lib/ipc/workspace';
import { hiddenStore } from '$lib/state/hidden.svelte';
import type { Item } from '$lib/types/item';
import type { WorkspaceWidget } from '$lib/types/workspace';
import { formatTarget } from '$lib/utils/format-target';
import { parseWidgetConfig } from '$lib/utils/widget-config';
import WidgetSettingsDialog from './WidgetSettingsDialog.svelte';

interface Props {
	widget?: WorkspaceWidget;
	onItemContext?: (itemId: string) => void;
}

let { widget, onItemContext }: Props = $props();

let recentItems = $state<Item[]>([]);
let settingsOpen = $state(false);

$effect(() => {
	const { max_items: limit } = parseWidgetConfig(widget?.config, { max_items: 10 });
	void getRecentItems(limit).then((items) => {
		recentItems = items;
	});
});

let visibleRecentItems = $derived(
	hiddenStore.isHiddenVisible ? recentItems : recentItems.filter((i) => i.is_enabled),
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
</script>

<WidgetShell title="Recent launches" icon={Clock3} {menuItems}>
	<div class="space-y-2">
		{#each visibleRecentItems as item (item.id)}
			<button
				type="button"
				class="flex w-full items-center justify-between rounded-2xl bg-[var(--ag-surface-3)] px-3 py-2.5 text-sm transition-colors duration-[var(--ag-duration-fast)] hover:bg-[var(--ag-surface-4)] motion-reduce:transition-none"
				onclick={() => void launchItem(item.id)}
				oncontextmenu={(e) => {
					if (onItemContext) {
						e.preventDefault();
						onItemContext(item.id);
					}
				}}
			>
				<span class="flex min-w-0 flex-1 items-center gap-2 text-[var(--ag-text-secondary)]">
					<ItemIcon iconPath={item.icon_path} alt="{item.label} icon" class="h-5 w-5 shrink-0 object-cover" />
					<span class="truncate">{item.label}</span>
				</span>
				<span class="shrink-0 max-w-[40%] truncate text-xs text-[var(--ag-text-muted)]">{formatTarget(item.target)}</span>
			</button>
		{/each}
		{#if visibleRecentItems.length === 0}
			<div class="py-4 text-center text-xs text-[var(--ag-text-muted)]">
				最近の起動履歴がここに表示されます
			</div>
		{/if}
	</div>
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => { settingsOpen = false; }} />
{/if}
