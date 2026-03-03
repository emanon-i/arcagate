<script lang="ts">
import { onMount } from 'svelte';
import { Button } from '$lib/components/ui/button';
import { workspaceStore } from '$lib/state/workspace.svelte';
import type { WidgetType } from '$lib/types/workspace';
import AddWidgetDialog from './AddWidgetDialog.svelte';
import WidgetGrid from './WidgetGrid.svelte';

let showAddWidget = $state(false);
let editingWorkspaceId = $state<string | null>(null);
let editingName = $state('');
let newWorkspaceName = $state('');
let showNewWorkspace = $state(false);

onMount(() => {
	void workspaceStore.loadWorkspaces();
});

function startEdit(id: string, name: string) {
	editingWorkspaceId = id;
	editingName = name;
}

async function submitEdit() {
	if (!editingWorkspaceId || !editingName.trim()) return;
	await workspaceStore.updateWorkspace(editingWorkspaceId, editingName.trim());
	editingWorkspaceId = null;
	editingName = '';
}

async function handleCreateWorkspace() {
	if (!newWorkspaceName.trim()) return;
	await workspaceStore.createWorkspace(newWorkspaceName.trim());
	newWorkspaceName = '';
	showNewWorkspace = false;
}

function handleAddWidget(type: WidgetType) {
	void workspaceStore.addWidget(type);
}

function handleRemoveWidget(id: string) {
	void workspaceStore.removeWidget(id);
}

function handleReorder(ordered: typeof workspaceStore.widgets) {
	void workspaceStore.persistWidgetOrder(ordered);
}

function handleResize(id: string, width: number, height: number) {
	void workspaceStore.resizeWidget(id, width, height);
}
</script>

<div class="flex h-full flex-col gap-4">
	<!-- ワークスペース タブバー -->
	<div class="flex items-center gap-2 border-b pb-2">
		{#each workspaceStore.workspaces as ws (ws.id)}
			{#if editingWorkspaceId === ws.id}
				<input
					class="rounded border px-2 py-1 text-sm"
					bind:value={editingName}
					onblur={submitEdit}
					onkeydown={(e) => e.key === 'Enter' && submitEdit()}
				/>
			{:else}
				<button
					class="rounded px-3 py-1 text-sm {workspaceStore.activeWorkspaceId === ws.id
						? 'bg-primary text-primary-foreground'
						: 'hover:bg-accent'}"
					onclick={() => workspaceStore.selectWorkspace(ws.id)}
					ondblclick={() => startEdit(ws.id, ws.name)}
				>
					{ws.name}
				</button>
			{/if}
		{/each}

		{#if showNewWorkspace}
			<input
				class="rounded border px-2 py-1 text-sm"
				bind:value={newWorkspaceName}
				placeholder="ワークスペース名"
				onblur={() => {
					showNewWorkspace = false;
					newWorkspaceName = '';
				}}
				onkeydown={(e) => {
					if (e.key === 'Enter') handleCreateWorkspace();
					if (e.key === 'Escape') {
						showNewWorkspace = false;
						newWorkspaceName = '';
					}
				}}
			/>
		{:else}
			<Button variant="ghost" size="sm" onclick={() => (showNewWorkspace = true)}>+</Button>
		{/if}

		<!-- アクティブワークスペースの削除ボタン -->
		{#if workspaceStore.activeWorkspaceId}
			<Button
				variant="ghost"
				size="sm"
				class="ml-auto text-muted-foreground hover:text-destructive"
				onclick={() => {
					if (workspaceStore.activeWorkspaceId) {
						void workspaceStore.deleteWorkspace(workspaceStore.activeWorkspaceId);
					}
				}}
			>
				削除
			</Button>
		{/if}

		<Button
			variant="outline"
			size="sm"
			onclick={() => (showAddWidget = true)}
			disabled={!workspaceStore.activeWorkspaceId}
		>
			ウィジェット追加
		</Button>
	</div>

	<!-- エラー表示 -->
	{#if workspaceStore.error}
		<p class="text-sm text-destructive">{workspaceStore.error}</p>
	{/if}

	<!-- ウィジェットグリッド -->
	{#if workspaceStore.activeWorkspaceId}
		{#if workspaceStore.loading}
			<p class="text-sm text-muted-foreground">読み込み中...</p>
		{:else if workspaceStore.widgets.length === 0}
			<div class="flex flex-1 items-center justify-center">
				<div class="text-center">
					<p class="text-muted-foreground">ウィジェットがありません</p>
					<Button class="mt-2" onclick={() => (showAddWidget = true)}>ウィジェットを追加</Button>
				</div>
			</div>
		{:else}
			<WidgetGrid
				widgets={workspaceStore.widgets}
				onReorder={handleReorder}
				onRemove={handleRemoveWidget}
				onResize={handleResize}
			/>
		{/if}
	{:else}
		<div class="flex flex-1 items-center justify-center">
			<div class="text-center">
				<p class="text-muted-foreground">ワークスペースを作成してください</p>
				<Button class="mt-2" onclick={() => (showNewWorkspace = true)}>ワークスペースを作成</Button>
			</div>
		</div>
	{/if}
</div>

<!-- ウィジェット追加ダイアログ -->
<AddWidgetDialog
	open={showAddWidget}
	onAdd={handleAddWidget}
	onClose={() => (showAddWidget = false)}
/>
