<script lang="ts">
import { ChevronRight, Star } from '@lucide/svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import { searchItemsInTag } from '$lib/ipc/items';
import { launchItem } from '$lib/ipc/launch';
import { hiddenStore } from '$lib/state/hidden.svelte';
import type { Item } from '$lib/types/item';
import type { WorkspaceWidget } from '$lib/types/workspace';
import { parseWidgetConfig } from '$lib/utils/widget-config';
import WidgetSettingsDialog from './WidgetSettingsDialog.svelte';

interface Props {
	widget?: WorkspaceWidget;
	onItemContext?: (itemId: string) => void;
}

let { widget, onItemContext }: Props = $props();

let favorites = $state<Item[]>([]);
let settingsOpen = $state(false);

$effect(() => {
	const { max_items: limit } = parseWidgetConfig(widget?.config, { max_items: 10 });
	void searchItemsInTag('sys-starred', '').then((items) => {
		favorites = items.slice(0, limit);
	});
});

let visibleFavorites = $derived(
	hiddenStore.isHiddenVisible ? favorites : favorites.filter((i) => i.is_enabled),
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

<WidgetShell title="Favorites" icon={Star} {menuItems}>
	<div class="space-y-2">
		{#each visibleFavorites as item (item.id)}
			<button
				type="button"
				class="flex w-full items-center justify-between rounded-2xl bg-[var(--ag-surface-3)] px-3 py-2.5 text-sm text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]"
				onclick={() => void launchItem(item.id)}
				oncontextmenu={(e) => {
					if (onItemContext) {
						e.preventDefault();
						onItemContext(item.id);
					}
				}}
			>
				<span class="flex min-w-0 flex-1 items-center gap-2">
					<ItemIcon iconPath={item.icon_path} alt="{item.label} icon" class="h-5 w-5 shrink-0 object-cover" />
					<span class="truncate">{item.label}</span>
				</span>
				<ChevronRight class="h-4 w-4 shrink-0 text-[var(--ag-text-faint)]" />
			</button>
		{/each}
		{#if visibleFavorites.length === 0}
			<div class="py-4 text-center text-xs text-[var(--ag-text-muted)]">
				★ のついたアイテムがここに表示されます
			</div>
		{/if}
	</div>
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => { settingsOpen = false; }} />
{/if}
