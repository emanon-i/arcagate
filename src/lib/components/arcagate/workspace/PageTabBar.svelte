<script lang="ts">
import Chip from '$lib/components/arcagate/common/Chip.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';

interface Props {
	onSelectWorkspace?: (id: string) => void;
}

let { onSelectWorkspace }: Props = $props();

let isAdding = $state(false);
let newName = $state('');

function startAdd() {
	isAdding = true;
	newName = '';
}

function commitAdd() {
	if (!isAdding) return;
	const name = newName.trim();
	if (name) {
		void workspaceStore.createWorkspace(name);
	}
	isAdding = false;
	newName = '';
}

function cancelAdd() {
	isAdding = false;
	newName = '';
}

function handleKeydown(e: KeyboardEvent) {
	if (e.key === 'Enter') {
		e.preventDefault();
		commitAdd();
	} else if (e.key === 'Escape') {
		e.preventDefault();
		cancelAdd();
	}
}
</script>

<div class="flex flex-wrap items-center gap-2">
	{#each workspaceStore.workspaces as ws (ws.id)}
		<Chip
			tone={ws.id === workspaceStore.activeWorkspaceId ? "accent" : "default"}
			size="md"
			onclick={() => onSelectWorkspace?.(ws.id)}
			data-testid="workspace-tab-{ws.id}"
		>
			{ws.name}
		</Chip>
	{/each}
	{#if isAdding}
		<!-- svelte-ignore a11y_autofocus -->
		<input
			type="text"
			class="w-24 rounded-full border border-[var(--ag-accent-border)] bg-[var(--ag-surface-3)] px-3 py-1 text-xs text-[var(--ag-text-primary)] outline-none placeholder:text-[var(--ag-text-muted)]"
			placeholder="名前"
			autocomplete="off"
			bind:value={newName}
			onkeydown={handleKeydown}
			onblur={commitAdd}
			autofocus
		/>
	{:else}
		<button
			type="button"
			class="rounded-full border border-dashed border-[var(--ag-border-dashed)] px-3 py-1.5 text-xs text-[var(--ag-text-muted)]"
			onclick={startAdd}
		>
			+ ページを追加
		</button>
	{/if}
</div>
