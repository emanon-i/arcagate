<script lang="ts">
import { FolderOpen } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import { watchFolders } from '$lib/mock/arcagate/workspace';

// TODO: watchFolders をバックエンド (cmd_list_watch_folders) から取得する
</script>

<WidgetShell title="Watch folders" icon={FolderOpen} badge="Auto tracked" source="Feeds Library auto-registration">
	<div class="grid gap-3 md:grid-cols-2">
		{#each watchFolders as [path, desc]}
			<div
				class="rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] p-4"
			>
				<div class="text-sm font-medium text-[var(--ag-text-primary)]">{path}</div>
				<div class="mt-2 text-xs leading-5 text-[var(--ag-text-muted)]">{desc}</div>
			</div>
		{/each}
	</div>
</WidgetShell>
