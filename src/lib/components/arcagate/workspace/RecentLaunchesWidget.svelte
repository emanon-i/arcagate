<script lang="ts">
import { ArrowRightLeft, Clock3 } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import { launchItem } from '$lib/ipc/launch';
import { getRecentItems } from '$lib/ipc/workspace';
import type { Item } from '$lib/types/item';

let recentItems = $state<Item[]>([]);

$effect(() => {
	void getRecentItems(10).then((items) => {
		recentItems = items;
	});
});
</script>

<WidgetShell title="Recent launches" icon={Clock3} badge="{recentItems.length} items" source="Usage log from Library">
	<div class="space-y-2">
		{#each recentItems as item (item.id)}
			<button
				type="button"
				class="flex w-full items-center justify-between rounded-2xl bg-[var(--ag-surface-3)] px-3 py-3 text-sm hover:bg-[var(--ag-surface-4)]"
				onclick={() => void launchItem(item.id)}
			>
				<div class="flex items-center gap-3 text-[var(--ag-text-secondary)]">
					<div class="h-2.5 w-2.5 rounded-full bg-cyan-300"></div>
					<span>{item.label}</span>
				</div>
				<span class="text-[var(--ag-text-muted)]">{item.target}</span>
			</button>
		{/each}
		{#if recentItems.length === 0}
			<div class="py-4 text-center text-xs text-[var(--ag-text-muted)]">
				最近の起動履歴がここに表示されます
			</div>
		{/if}
	</div>
</WidgetShell>
