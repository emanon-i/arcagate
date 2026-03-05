<script lang="ts">
import Chip from '$lib/components/arcagate/common/Chip.svelte';
import { configStore } from '$lib/state/config.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';

interface Props {
	onSelectWorkspace?: (id: string) => void;
}

let { onSelectWorkspace }: Props = $props();

function handleAddPage() {
	const name = prompt('ワークスペース名を入力:');
	if (name?.trim()) {
		void workspaceStore.createWorkspace(name.trim());
	}
}
</script>

<div class="flex flex-wrap items-center justify-between gap-3">
	<div class="flex flex-wrap items-center gap-2">
		{#each workspaceStore.workspaces as ws (ws.id)}
			<Chip
				tone={ws.id === workspaceStore.activeWorkspaceId ? "accent" : "default"}
				onclick={() => onSelectWorkspace?.(ws.id)}
				data-testid="workspace-tab-{ws.id}"
			>
				{ws.name}
			</Chip>
		{/each}
		<button
			type="button"
			class="rounded-full border border-dashed border-[var(--ag-border-dashed)] px-3 py-1.5 text-xs text-[var(--ag-text-muted)]"
			onclick={handleAddPage}
		>
			+ Add page
		</button>
	</div>
	<div class="flex flex-wrap gap-2">
		<Chip tone={configStore.themeMode === "dark" ? "accent" : "default"} onclick={() => void configStore.setTheme('dark')}>
			Dark
		</Chip>
		<Chip tone={configStore.themeMode === "light" ? "accent" : "default"} onclick={() => void configStore.setTheme('light')}>
			Light
		</Chip>
		<Chip>Theme settings</Chip>
	</div>
</div>
