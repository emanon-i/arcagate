<script lang="ts">
import { FolderKanban, GitBranch } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import { launchItem } from '$lib/ipc/launch';
import { getFolderItems } from '$lib/ipc/workspace';
import type { Item } from '$lib/types/item';

let folderItems = $state<Item[]>([]);

$effect(() => {
	void getFolderItems().then((items) => {
		folderItems = items;
	});
});
</script>

<WidgetShell
	title="Projects & Git status"
	icon={GitBranch}
	badge="{folderItems.length} folders"
	source="Project shortcuts"
>
	<div class="grid gap-3 md:grid-cols-3">
		{#each folderItems as item (item.id)}
			<button
				type="button"
				class="rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] p-4 text-left hover:bg-[var(--ag-surface-4)]"
				onclick={() => void launchItem(item.id)}
			>
				<div class="mb-2 flex items-center justify-between">
					<div class="text-sm font-semibold text-[var(--ag-text-primary)]">{item.label}</div>
					<FolderKanban class="h-4 w-4 text-[var(--ag-text-faint)]" />
				</div>
				<div class="truncate text-xs text-[var(--ag-text-muted)]">{item.target}</div>
			</button>
		{/each}
		{#if folderItems.length === 0}
			<div class="col-span-3 py-4 text-center text-xs text-[var(--ag-text-muted)]">
				フォルダ型アイテムがここに表示されます
			</div>
		{/if}
	</div>
</WidgetShell>
