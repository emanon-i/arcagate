<script lang="ts">
import { TrendingUp } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import { launchItem } from '$lib/ipc/launch';
import { getFrequentItems } from '$lib/ipc/workspace';
import { toastStore } from '$lib/state/toast.svelte';
import { workspaceContextMenuStore } from '$lib/state/workspace-context-menu.svelte';
import type { Item } from '$lib/types/item';
import { STATS_WIDGET_DEFAULTS } from '$lib/types/widget-configs';
import { WIDGET_LABELS, type WorkspaceWidget } from '$lib/types/workspace';
import { formatLaunchError } from '$lib/utils/launch-error';
import { parseWidgetConfig } from '$lib/utils/widget-config';
import { widgetMenuItems } from '../_shared/menu-items';

interface Props {
	widget?: WorkspaceWidget;
	onItemContext?: (itemId: string, ev?: MouseEvent) => void;
}

let { widget }: Props = $props();

let topItems = $state<Item[]>([]);
let settingsOpen = $state(false);

$effect(() => {
	const { max_items: limit } = parseWidgetConfig(widget?.config, STATS_WIDGET_DEFAULTS);
	void getFrequentItems(limit).then((items) => {
		topItems = items;
	});
});

let menuItems = $derived(widgetMenuItems(widget, () => (settingsOpen = true)));

async function handleLaunch(id: string) {
	const item = topItems.find((i) => i.id === id);
	await launchItem(id)
		.then(() => toastStore.add(`${item?.label ?? id} を起動しました`, 'success'))
		.catch((e: unknown) => toastStore.add(formatLaunchError(item?.label ?? id, e), 'error'));
}
</script>

<WidgetShell title={WIDGET_LABELS.stats} icon={TrendingUp} {menuItems}>
	<!-- J-3 (2026-05-12): @container query で wide widget で multi-column 化。 -->
	<div class="@container">
		<div class="grid gap-1.5 @md:grid-cols-2 @[28rem]:grid-cols-3 @[40rem]:grid-cols-4">
			{#each topItems as item, i (item.id)}
				<button
					type="button"
					class="flex w-full items-center justify-between rounded-2xl bg-[var(--ag-surface-3)] px-3 py-2.5 text-sm text-[var(--ag-text-secondary)] transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)]"
					onclick={() => void handleLaunch(item.id)}
					oncontextmenu={(e) => {
						e.preventDefault();
						e.stopPropagation();
						workspaceContextMenuStore.openMenuFor({
							itemId: item.id,
							path: item.target,
							widgetId: widget?.id ?? null,
							onOpenSettings: () => (settingsOpen = true),
							ev: e,
						});
					}}
				>
					<span class="flex min-w-0 items-center gap-2">
						<span class="w-4 shrink-0 text-center text-xs text-[var(--ag-text-faint)]">{i + 1}</span>
						<span class="truncate">{item.label}</span>
					</span>
				</button>
			{/each}
			{#if topItems.length === 0}
				<div class="col-span-full py-4 text-center text-xs text-[var(--ag-text-muted)]">起動履歴がありません</div>
			{/if}
		</div>
	</div>
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => { settingsOpen = false; }} />
{/if}
