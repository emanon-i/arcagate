<script lang="ts">
import { FolderOpen } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import { getWatchedPaths } from '$lib/ipc/watched_paths';
import type { WatchedPath } from '$lib/types/watched_path';

let watchFolders = $state<WatchedPath[]>([]);

$effect(() => {
	void getWatchedPaths().then((paths) => {
		watchFolders = paths;
	});
});
</script>

<WidgetShell title="Watch folders" icon={FolderOpen} badge="{watchFolders.length} tracked" source="Feeds Library auto-registration">
	<div class="grid gap-3 md:grid-cols-2">
		{#each watchFolders as wp (wp.id)}
			<div
				class="rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] p-4"
			>
				<div class="text-sm font-medium text-[var(--ag-text-primary)]">{wp.path}</div>
				{#if wp.label}
					<div class="mt-2 text-xs leading-5 text-[var(--ag-text-muted)]">{wp.label}</div>
				{/if}
			</div>
		{/each}
		{#if watchFolders.length === 0}
			<div class="col-span-2 py-4 text-center text-xs text-[var(--ag-text-muted)]">
				監視フォルダがここに表示されます
			</div>
		{/if}
	</div>
</WidgetShell>
