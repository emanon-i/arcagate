<script lang="ts">
import Tip from '$lib/components/arcagate/common/Tip.svelte';
import LibraryDetailPanel from '$lib/components/arcagate/library/LibraryDetailPanel.svelte';
import { configStore } from '$lib/state/config.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { clampWidget } from '$lib/utils/widget-grid';
import FavoritesWidget from './FavoritesWidget.svelte';
import PageTabBar from './PageTabBar.svelte';
import ProjectsWidget from './ProjectsWidget.svelte';
import RecentLaunchesWidget from './RecentLaunchesWidget.svelte';
import WorkspaceDeleteConfirmDialog from './WorkspaceDeleteConfirmDialog.svelte';
import WorkspaceHintBar from './WorkspaceHintBar.svelte';
import WorkspaceRenameDialog from './WorkspaceRenameDialog.svelte';
import WorkspaceSidebar from './WorkspaceSidebar.svelte';
import WorkspaceWidgetGrid from './WorkspaceWidgetGrid.svelte';

interface Props {
	onEditItem?: (id: string) => void;
}

let { onEditItem }: Props = $props();

const BASE_W = 320;
const BASE_H = 180;
let widgetW = $derived(Math.round(BASE_W * (configStore.widgetZoom / 100)));
let widgetH = $derived(Math.round(BASE_H * (configStore.widgetZoom / 100)));

$effect(() => {
	void workspaceStore.loadWorkspaces();
});

let editMode = $state(false);
let selectedWidgetId = $state<string | null>(null);
let renameOpen = $state(false);
let deleteConfirmId = $state<string | null>(null);
let contextItemId = $state<string | null>(null);
let workspaceContainer = $state<HTMLDivElement | null>(null);
let containerWidth = $state(0);

$effect(() => {
	const el = workspaceContainer;
	if (!el) return;
	containerWidth = el.clientWidth;
	const ro = new ResizeObserver((entries) => {
		for (const entry of entries) {
			containerWidth = entry.contentRect.width;
		}
	});
	ro.observe(el);
	return () => ro.disconnect();
});

let dynamicCols = $derived(
	containerWidth > 0 && widgetW > 0 ? Math.max(1, Math.floor(containerWidth / widgetW)) : 4,
);

let currentWorkspaceName = $derived(
	workspaceStore.workspaces.find((w) => w.id === workspaceStore.activeWorkspaceId)?.name ?? '',
);

function handleSelectWorkspace(id: string) {
	void workspaceStore.selectWorkspace(id);
}

function confirmRename(name: string) {
	const ws = workspaceStore.workspaces.find((w) => w.id === workspaceStore.activeWorkspaceId);
	if (ws && name.trim() && name !== ws.name) {
		void workspaceStore.updateWorkspace(ws.id, name.trim());
	}
	renameOpen = false;
}

function startEdit() {
	editMode = true;
	selectedWidgetId = null;
}

function confirmEdit() {
	editMode = false;
	selectedWidgetId = null;
}

function cancelEdit() {
	editMode = false;
	selectedWidgetId = null;
	// DB と同期して不整合を防ぐ（編集中の操作は即座に DB 反映されるため）
	if (workspaceStore.activeWorkspaceId) {
		void workspaceStore.loadWidgets(workspaceStore.activeWorkspaceId);
	}
}

const widgetComponents = {
	favorites: FavoritesWidget,
	recent: RecentLaunchesWidget,
	projects: ProjectsWidget,
} as const;

function handleItemContext(itemId: string) {
	contextItemId = itemId;
}

function handleWheel(e: WheelEvent) {
	if (!e.ctrlKey) return;
	e.preventDefault();
	const delta = e.deltaY > 0 ? -10 : 10;
	configStore.setWidgetZoom(configStore.widgetZoom + delta);
}

// passive: false required for preventDefault in wheel handler
$effect(() => {
	const el = workspaceContainer;
	if (!el) return;
	el.addEventListener('wheel', handleWheel, { passive: false });
	return () => el.removeEventListener('wheel', handleWheel);
});

let maxRow = $derived(Math.max(3, ...workspaceStore.widgets.map((w) => w.position_y + w.height)));
</script>

<svelte:window
	onkeydown={(e) => {
		if (!editMode) return;
		if (e.key === 'Escape' && !deleteConfirmId && !renameOpen) {
			cancelEdit();
		} else if (e.key === 'Enter' && !deleteConfirmId && !renameOpen) {
			e.preventDefault();
			confirmEdit();
		}
		if (
			(e.key === 'Delete' || e.key === 'Backspace') &&
			selectedWidgetId &&
			!deleteConfirmId &&
			!renameOpen
		) {
			e.preventDefault();
			deleteConfirmId = selectedWidgetId;
		}
	}}
/>

<div class="relative flex h-full">
	<WorkspaceHintBar {editMode} {selectedWidgetId} />

	<WorkspaceSidebar
		{editMode}
		onToggleEdit={startEdit}
		onConfirmEdit={confirmEdit}
		onCancelEdit={cancelEdit}
	/>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="min-w-0 flex-1 overflow-auto p-5"
		style="--widget-w: {widgetW}px; --widget-h: {widgetH}px; background-image: {editMode
			? 'radial-gradient(circle, rgba(128,128,128,0.22) 1.5px, transparent 1.5px), linear-gradient(180deg,var(--ag-surface-0) 0%,var(--ag-surface-page) 100%)'
			: 'linear-gradient(180deg,var(--ag-surface-0) 0%,var(--ag-surface-page) 100%)'}; background-size: {editMode
			? '24px 24px, 100% 100%'
			: '100% 100%'};"
		data-zoom={configStore.widgetZoom}
		bind:this={workspaceContainer}
	>
		<div class="mb-5" class:pointer-events-none={editMode} class:opacity-50={editMode}>
			<PageTabBar onSelectWorkspace={handleSelectWorkspace} onRenameActive={() => (renameOpen = true)} />
		</div>

		{#if !editMode}
			<div class="mb-4">
				<Tip tone="accent" tipId="workspace-home-tip">
					このページはホームです。よく使うものをまとめて配置できます。
				</Tip>
			</div>
		{/if}

		<div class="flex gap-4">
			<div class="min-w-0 flex-1">
				{#if editMode}
					<div class="mb-4">
						<Tip tone="accent" tipId="workspace-edit-guide">
							クリックで選択、ドラッグで移動、右下のハンドルでリサイズ、ゴミ箱で削除できます。
						</Tip>
					</div>

					<WorkspaceWidgetGrid
						{dynamicCols}
						{maxRow}
						{widgetW}
						{widgetH}
						{widgetComponents}
						{selectedWidgetId}
						{deleteConfirmId}
						onItemContext={handleItemContext}
						onSelectedWidgetIdChange={(id) => (selectedWidgetId = id)}
						onDeleteConfirmIdChange={(id) => (deleteConfirmId = id)}
					/>
				{:else if workspaceStore.widgets.length > 0}
					<div
						style="display: grid; grid-template-columns: repeat({dynamicCols}, var(--widget-w)); grid-auto-rows: var(--widget-h); gap: 16px;"
					>
						{#each workspaceStore.widgets as widget (widget.id)}
							{@const WidgetComp =
								widgetComponents[widget.widget_type as keyof typeof widgetComponents]}
							{@const clamped = clampWidget(widget, dynamicCols)}
							{#if WidgetComp}
								<div
									style="grid-column: {clamped.x + 1} / span {clamped.span}; grid-row: {widget.position_y +
										1} / span {widget.height};"
								>
									<WidgetComp {widget} onItemContext={handleItemContext} />
								</div>
							{/if}
						{/each}
					</div>
				{:else}
					<div class="flex flex-col items-center justify-center gap-2 py-20">
						<p class="text-sm text-[var(--ag-text-muted)]">ウィジェットがまだ追加されていません</p>
						<p class="text-xs text-[var(--ag-text-faint)]">
							左の編集ボタンを押してウィジェットをドラッグで追加できます
						</p>
					</div>
				{/if}
			</div>

			{#if contextItemId}
				<div class="w-80 shrink-0">
					<LibraryDetailPanel
						selectedItemId={contextItemId}
						{onEditItem}
						onClose={() => (contextItemId = null)}
					/>
				</div>
			{/if}
		</div>
	</div>
</div>

<WorkspaceDeleteConfirmDialog
	widgetId={deleteConfirmId}
	onConfirm={() => {
		if (deleteConfirmId) void workspaceStore.removeWidget(deleteConfirmId);
		deleteConfirmId = null;
	}}
	onCancel={() => (deleteConfirmId = null)}
/>

<WorkspaceRenameDialog
	open={renameOpen}
	currentName={currentWorkspaceName}
	onConfirm={confirmRename}
	onCancel={() => (renameOpen = false)}
/>
