<script lang="ts">
import { TrendingUp } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import { launchItem } from '$lib/ipc/launch';
import { getFrequentItems } from '$lib/ipc/workspace';
import { toastStore } from '$lib/state/toast.svelte';
import type { Item } from '$lib/types/item';
import { STATS_WIDGET_DEFAULTS } from '$lib/types/widget-configs';
import { WIDGET_LABELS, type WorkspaceWidget } from '$lib/types/workspace';
import { parseWidgetConfig } from '$lib/utils/widget-config';

interface Props {
	widget?: WorkspaceWidget;
	onItemContext?: (itemId: string) => void;
}

let { widget, onItemContext }: Props = $props();

let topItems = $state<Item[]>([]);
let settingsOpen = $state(false);

$effect(() => {
	const { max_items: limit } = parseWidgetConfig(widget?.config, STATS_WIDGET_DEFAULTS);
	void getFrequentItems(limit).then((items) => {
		topItems = items;
	});
});

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
	const item = topItems.find((i) => i.id === id);
	await launchItem(id)
		.then(() => toastStore.add(`${item?.label ?? id} を起動しました`, 'success'))
		.catch((e: unknown) => toastStore.add(`起動に失敗しました: ${String(e)}`, 'error'));
}
</script>

<WidgetShell title={WIDGET_LABELS.stats} icon={TrendingUp} {menuItems}>
	<div class="space-y-1.5">
		{#each topItems as item, i (item.id)}
			<button
				type="button"
				class="flex w-full items-center justify-between rounded-2xl bg-[var(--ag-surface-3)] px-3 py-2.5 text-sm text-[var(--ag-text-secondary)] transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)]"
				onclick={() => void handleLaunch(item.id)}
				oncontextmenu={(e) => {
					if (onItemContext) {
						e.preventDefault();
						onItemContext(item.id);
					}
				}}
			>
				<span class="flex min-w-0 items-center gap-2">
					<span class="w-4 shrink-0 text-center text-xs text-[var(--ag-text-faint)]">{i + 1}</span>
					<span class="truncate">{item.label}</span>
				</span>
			</button>
		{/each}
		{#if topItems.length === 0}
			<div class="py-4 text-center text-xs text-[var(--ag-text-muted)]">起動履歴がありません</div>
		{/if}
	</div>
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => { settingsOpen = false; }} />
{/if}
