<script lang="ts">
import Tip from '$lib/components/arcagate/common/Tip.svelte';
import LibraryDetailPanel from '$lib/components/arcagate/library/LibraryDetailPanel.svelte';
import * as workspaceIpc from '$lib/ipc/workspace';
import { configStore } from '$lib/state/config.svelte';
import { pointerDrag } from '$lib/state/pointer-drag.svelte';
import { useWidgetZoom } from '$lib/state/widget-zoom.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { clampWidget } from '$lib/utils/widget-grid';
import ClockWidget from './ClockWidget.svelte';
import FavoritesWidget from './FavoritesWidget.svelte';
import ItemWidget from './ItemWidget.svelte';
import PageTabBar from './PageTabBar.svelte';
import ProjectsWidget from './ProjectsWidget.svelte';
import QuickNoteWidget from './QuickNoteWidget.svelte';
import RecentLaunchesWidget from './RecentLaunchesWidget.svelte';
import StatsWidget from './StatsWidget.svelte';
import WorkspaceDeleteConfirmDialog from './WorkspaceDeleteConfirmDialog.svelte';
import WorkspaceHintBar from './WorkspaceHintBar.svelte';
import WorkspaceRenameDialog from './WorkspaceRenameDialog.svelte';
import WorkspaceSidebar from './WorkspaceSidebar.svelte';
import WorkspaceWidgetGrid from './WorkspaceWidgetGrid.svelte';

interface Props {
	onEditItem?: (id: string) => void;
}

let { onEditItem }: Props = $props();

const zoom = useWidgetZoom(() => workspaceContainer);

$effect(() => {
	void workspaceStore.loadWorkspaces();
});

type WidgetSnapshot = { id: string; x: number; y: number; w: number; h: number };

let editMode = $state(false);
let selectedWidgetId = $state<string | null>(null);
let editSnapshot = $state<WidgetSnapshot[]>([]);
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

// ウィジェットが占める最大列数（ウィンドウが狭くなっても下回らせない）
let minGridCols = $derived(
	workspaceStore.widgets.length > 0
		? Math.max(1, ...workspaceStore.widgets.map((w) => w.position_x + w.width))
		: 1,
);

let dynamicCols = $derived(
	containerWidth > 0 && zoom.widgetW > 0
		? Math.max(minGridCols, Math.floor(containerWidth / zoom.widgetW))
		: Math.max(minGridCols, 4),
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
	editSnapshot = workspaceStore.widgets.map((w) => ({
		id: w.id,
		x: w.position_x,
		y: w.position_y,
		w: w.width,
		h: w.height,
	}));
}

function confirmEdit() {
	editMode = false;
	selectedWidgetId = null;
	editSnapshot = [];
}

function cancelEdit() {
	editMode = false;
	selectedWidgetId = null;
	void doRestoreSnapshot();
}

async function doRestoreSnapshot() {
	const snapshot = editSnapshot;
	editSnapshot = [];
	const snapshotIds = new Set(snapshot.map((s) => s.id));
	// 編集中に追加されたウィジェットを削除
	for (const w of workspaceStore.widgets) {
		if (!snapshotIds.has(w.id)) {
			await workspaceIpc.removeWidget(w.id);
		}
	}
	// 元の位置・サイズに戻す
	for (const snap of snapshot) {
		await workspaceIpc.updateWidgetPosition(snap.id, snap.x, snap.y, snap.w, snap.h);
	}
	if (workspaceStore.activeWorkspaceId) {
		void workspaceStore.loadWidgets(workspaceStore.activeWorkspaceId);
	}
}

const widgetComponents = {
	favorites: FavoritesWidget,
	recent: RecentLaunchesWidget,
	projects: ProjectsWidget,
	item: ItemWidget,
	clock: ClockWidget,
	stats: StatsWidget,
	quick_note: QuickNoteWidget,
} as const;

function handleItemContext(itemId: string) {
	contextItemId = itemId;
}

let maxRow = $derived(Math.max(3, ...workspaceStore.widgets.map((w) => w.position_y + w.height)));
</script>

<svelte:window
	onkeydown={(e) => {
		if (!editMode) return;
		if (e.key === 'Escape') {
			if (deleteConfirmId) {
				// 削除確認ダイアログが開いている場合はダイアログを閉じる（cancelEdit はしない）
				deleteConfirmId = null;
			} else if (!renameOpen) {
				cancelEdit();
			}
			// renameOpen の場合はダイアログ内 autofocus input が ESC を処理
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

<!-- Pointer drag ghost (follows cursor while dragging sidebar widget or moving widget) -->
{#if pointerDrag.active}
	<div
		class="pointer-events-none fixed z-[999] flex items-center justify-center rounded-lg opacity-80 shadow-lg"
		style="
			background: var(--ag-accent);
			width: 72px;
			height: 36px;
			left: {pointerDrag.clientX - 36}px;
			top: {pointerDrag.clientY - 18}px;
			transform: scale({pointerDrag.dropCell ? 1.08 : 1});
			transition: transform 80ms ease;
		"
	></div>
{/if}

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
		class="min-w-0 flex-1 overflow-auto [scrollbar-gutter:stable] p-5"
		style="--widget-w: {zoom.widgetW}px; --widget-h: {zoom.widgetH}px; background-image: {editMode
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
						widgetW={zoom.widgetW}
						widgetH={zoom.widgetH}
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
