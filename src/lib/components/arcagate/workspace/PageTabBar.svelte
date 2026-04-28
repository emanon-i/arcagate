<script lang="ts">
import { Image as ImageIcon } from '@lucide/svelte';
import Chip from '$lib/components/arcagate/common/Chip.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';

interface Props {
	onSelectWorkspace?: (id: string) => void;
	onRenameActive?: () => void;
	onEditWallpaper?: () => void;
}

let { onSelectWorkspace, onRenameActive, onEditWallpaper }: Props = $props();

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
			ondblclick={ws.id === workspaceStore.activeWorkspaceId ? () => onRenameActive?.() : undefined}
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
			class="rounded-full border border-dashed border-[var(--ag-border-dashed)] px-3 py-1.5 text-xs text-[var(--ag-text-muted)] transition-[color,border-color,background-color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:border-[var(--ag-accent-border)] hover:text-[var(--ag-accent-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
			onclick={startAdd}
		>
			+ ページを追加
		</button>
	{/if}
	<!-- PH-issue-009 Phase B: 壁紙設定 (active workspace 用)。
	     ghost-icon、active workspace がある時のみ可視 -->
	{#if onEditWallpaper && workspaceStore.activeWorkspaceId}
		<button
			type="button"
			class="ml-auto flex items-center gap-1 rounded-full border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2.5 py-1.5 text-xs text-[var(--ag-text-muted)] transition-[color,background-color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-surface-4)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
			aria-label="このワークスペースの壁紙を設定"
			onclick={() => onEditWallpaper()}
		>
			<ImageIcon class="h-3.5 w-3.5" />
			壁紙
		</button>
	{/if}
</div>
