<script lang="ts">
import { FolderKanban, GitBranch } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import { projectShortcuts } from '$lib/mock/arcagate/workspace';

// TODO: projectShortcuts をバックエンド (cmd_list_project_shortcuts) から取得する
</script>

<WidgetShell
	title="Projects & Git status"
	icon={GitBranch}
	badge="{projectShortcuts.length} repos"
	source="Project shortcuts"
>
	<div class="grid gap-3 md:grid-cols-3">
		{#each projectShortcuts as [name, status]}
			<div
				class="rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] p-4"
			>
				<div class="mb-2 flex items-center justify-between">
					<div class="text-sm font-semibold text-[var(--ag-text-primary)]">{name}</div>
					<FolderKanban class="h-4 w-4 text-[var(--ag-text-faint)]" />
				</div>
				<div class="text-xs text-[var(--ag-text-muted)]">{status}</div>
				<div
					class="mt-4 rounded-2xl bg-[var(--ag-surface-3)] px-3 py-2 text-xs text-[var(--ag-text-secondary)]"
				>
					Open workspace
				</div>
			</div>
		{/each}
	</div>
</WidgetShell>
