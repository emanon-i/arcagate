<script lang="ts">
import { Image as ImageIcon } from '@lucide/svelte';
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
	<!-- 4/30 user 検収: workspace 選択 chip の塗りつぶし削除。border-only で active を識別、
	     wallpaper / surface gradient が透けて見えるよう全 chip を bg-transparent に。 -->
	{#each workspaceStore.workspaces as ws (ws.id)}
		{@const isActive = ws.id === workspaceStore.activeWorkspaceId}
		<button
			type="button"
			class="rounded-full border bg-transparent px-3.5 py-1.5 text-xs transition-[color,border-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
			class:border-[var(--ag-accent-border)]={isActive}
			class:text-[var(--ag-accent-text)]={isActive}
			class:font-medium={isActive}
			class:border-[var(--ag-border)]={!isActive}
			class:text-[var(--ag-text-secondary)]={!isActive}
			class:hover:text-[var(--ag-text-primary)]={!isActive}
			class:hover:border-[var(--ag-border-strong)]={!isActive}
			onclick={() => onSelectWorkspace?.(ws.id)}
			ondblclick={isActive ? () => onRenameActive?.() : undefined}
			data-testid="workspace-tab-{ws.id}"
		>
			{ws.name}
		</button>
	{/each}
	{#if isAdding}
		<!-- svelte-ignore a11y_autofocus -->
		<input
			type="text"
			class="w-24 rounded-full border border-[var(--ag-accent-border)] bg-transparent px-3 py-1 text-xs text-[var(--ag-text-primary)] outline-none placeholder:text-[var(--ag-text-muted)]"
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
			class="ml-auto flex items-center gap-1 rounded-full border border-[var(--ag-border)] bg-transparent px-2.5 py-1.5 text-xs text-[var(--ag-text-muted)] transition-[color,border-color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:border-[var(--ag-accent-border)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
			aria-label="このワークスペースの壁紙を設定"
			onclick={() => onEditWallpaper()}
		>
			<ImageIcon class="h-3.5 w-3.5" />
			壁紙
		</button>
	{/if}
</div>
