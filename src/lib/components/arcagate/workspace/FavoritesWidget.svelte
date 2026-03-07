<script lang="ts">
import { ChevronRight, Star } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import { launchItem } from '$lib/ipc/launch';
import { getFrequentItems } from '$lib/ipc/workspace';
import type { Item } from '$lib/types/item';

let favorites = $state<Item[]>([]);

$effect(() => {
	void getFrequentItems(10).then((items) => {
		favorites = items;
	});
});
</script>

<WidgetShell title="Favorites" icon={Star}>
	<div class="space-y-2">
		{#each favorites as item (item.id)}
			<button
				type="button"
				class="flex w-full items-center justify-between rounded-2xl bg-[var(--ag-surface-3)] px-3 py-2.5 text-sm text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]"
				onclick={() => void launchItem(item.id)}
			>
				<span>{item.label}</span>
				<ChevronRight class="h-4 w-4 text-[var(--ag-text-faint)]" />
			</button>
		{/each}
		{#if favorites.length === 0}
			<div class="py-4 text-center text-xs text-[var(--ag-text-muted)]">
				よく使うアイテムがここに表示されます
			</div>
		{/if}
	</div>
</WidgetShell>
