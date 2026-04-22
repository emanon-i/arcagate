<script lang="ts">
import Tip from '$lib/components/arcagate/common/Tip.svelte';
import LibraryDetailPanel from '$lib/components/arcagate/library/LibraryDetailPanel.svelte';
import { configStore } from '$lib/state/config.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import type { WidgetType } from '$lib/types/workspace';
import { clampWidget } from '$lib/utils/widget-grid';
import FavoritesWidget from './FavoritesWidget.svelte';
import PageTabBar from './PageTabBar.svelte';
import ProjectsWidget from './ProjectsWidget.svelte';
import RecentLaunchesWidget from './RecentLaunchesWidget.svelte';
import WorkspaceSidebar from './WorkspaceSidebar.svelte';
import WorkspaceWidgetGrid from './WorkspaceWidgetGrid.svelte';

interface Props {
	onEditItem?: (id: string) => void;
}

let { onEditItem }: Props = $props();

// Base widget dimensions (at 100% zoom)
const BASE_W = 320;
const BASE_H = 180;
// Computed pixel sizes from zoom
let widgetW = $derived(Math.round(BASE_W * (configStore.widgetZoom / 100)));
let widgetH = $derived(Math.round(BASE_H * (configStore.widgetZoom / 100)));

$effect(() => {
	void workspaceStore.loadWorkspaces();
});

let editMode = $state(false);
let selectedWidgetId = $state<string | null>(null);
let dragOverCell = $state<{ x: number; y: number } | null>(null);
let movingWidget = $state<string | null>(null);
let dropZone = $state<HTMLDivElement | null>(null);
let renameOpen = $state(false);
let renameValue = $state('');
let deleteConfirmId = $state<string | null>(null);
let contextItemId = $state<string | null>(null);

// Reference to workspace container for dynamic column calculation
let workspaceContainer = $state<HTMLDivElement | null>(null);

// Track container width reactively via ResizeObserver
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

// Calculate dynamic column count from tracked container width
let dynamicCols = $derived(
	containerWidth > 0 && widgetW > 0 ? Math.max(1, Math.floor(containerWidth / widgetW)) : 4,
);

function handleSelectWorkspace(id: string) {
	void workspaceStore.selectWorkspace(id);
}

function handleRenameWorkspace() {
	const ws = workspaceStore.workspaces.find((w) => w.id === workspaceStore.activeWorkspaceId);
	if (!ws) return;
	renameValue = ws.name;
	renameOpen = true;
}

function confirmRename() {
	const ws = workspaceStore.workspaces.find((w) => w.id === workspaceStore.activeWorkspaceId);
	if (ws && renameValue.trim() && renameValue !== ws.name) {
		void workspaceStore.updateWorkspace(ws.id, renameValue.trim());
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

// Attach wheel listener with { passive: false } to allow preventDefault
$effect(() => {
	const el = workspaceContainer;
	if (!el) return;
	el.addEventListener('wheel', handleWheel, { passive: false });
	return () => el.removeEventListener('wheel', handleWheel);
});

function calcGridPosition(e: DragEvent): { x: number; y: number } {
	const ref = dropZone;
	if (!ref) return { x: 0, y: 0 };
	const rect = ref.getBoundingClientRect();
	const relX = e.clientX - rect.left;
	const relY = e.clientY - rect.top;
	const gap = 16;
	const cellW = widgetW + gap;
	const cellH = widgetH + gap;
	const x = Math.max(0, Math.min(dynamicCols - 1, Math.floor(relX / cellW)));
	const y = Math.max(0, Math.floor(relY / cellH));
	return { x, y };
}

function handleDragOver(e: DragEvent) {
	e.preventDefault();
	const pos = calcGridPosition(e);
	dragOverCell = pos;
}

function handleDragLeave() {
	dragOverCell = null;
}

function handleDrop(e: DragEvent) {
	e.preventDefault();
	dragOverCell = null;
	const pos = calcGridPosition(e);
	const widgetType = e.dataTransfer?.getData('widget-type') as WidgetType | undefined;
	const moveId = e.dataTransfer?.getData('widget-move-id');

	if (moveId) {
		void workspaceStore.moveWidget(moveId, pos.x, pos.y);
	} else if (widgetType && widgetType in widgetComponents) {
		void workspaceStore.addWidgetAt(widgetType, pos.x, pos.y);
	}
	movingWidget = null;
}

// Imperative drag event listeners (Svelte 5 delegation may break preventDefault for dragover)
$effect(() => {
	const el = dropZone;
	if (!el) return;
	el.addEventListener('dragover', handleDragOver);
	el.addEventListener('drop', handleDrop);
	el.addEventListener('dragleave', handleDragLeave);
	return () => {
		el.removeEventListener('dragover', handleDragOver);
		el.removeEventListener('drop', handleDrop);
		el.removeEventListener('dragleave', handleDragLeave);
	};
});

// Compute grid rows needed
let maxRow = $derived(Math.max(3, ...workspaceStore.widgets.map((w) => w.position_y + w.height)));
</script>

<svelte:window
	onkeydown={(e) => {
		if (!editMode) return;
		if (e.key === 'Escape' && !deleteConfirmId && !renameOpen) {
			cancelEdit();
		}
		if ((e.key === 'Delete' || e.key === 'Backspace') && selectedWidgetId && !deleteConfirmId && !renameOpen) {
			e.preventDefault();
			deleteConfirmId = selectedWidgetId;
		}
	}}
/>

<div class="relative flex h-full">
	<!-- 編集モード キーボードヒントバー -->
	{#if editMode}
		<div class="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2">
			<div class="flex items-center gap-3 rounded-full border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)]/95 px-4 py-1.5 text-xs text-[var(--ag-text-muted)] shadow-[var(--ag-shadow-dialog)] backdrop-blur-sm">
				<span><kbd class="font-mono">Esc</kbd> 終了</span>
				<span class="opacity-30">|</span>
				<span><kbd class="font-mono">Del</kbd> 削除</span>
				{#if selectedWidgetId}
					<span class="opacity-30">|</span>
					<span class="text-[var(--ag-accent)]">1件選択中</span>
				{/if}
			</div>
		</div>
	{/if}

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
			<PageTabBar onSelectWorkspace={handleSelectWorkspace} />
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
					<!-- 編集モード操作ガイド -->
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
						{movingWidget}
						{deleteConfirmId}
						{dragOverCell}
						onItemContext={handleItemContext}
						onSelectedWidgetIdChange={(id) => { selectedWidgetId = id; }}
						onMovingWidgetChange={(id) => { movingWidget = id; }}
						onDeleteConfirmIdChange={(id) => { deleteConfirmId = id; }}
						onDragOverCellChange={(cell) => { dragOverCell = cell; }}
						onDropZoneElChange={(el) => { dropZone = el; }}
					/>
				{:else if workspaceStore.widgets.length > 0}
					<!-- Normal view: CSS Grid layout with auto-fill -->
					<div
						style="display: grid; grid-template-columns: repeat({dynamicCols}, var(--widget-w)); grid-auto-rows: var(--widget-h); gap: 16px;"
					>
						{#each workspaceStore.widgets as widget (widget.id)}
							{@const WidgetComp = widgetComponents[widget.widget_type as keyof typeof widgetComponents]}
							{@const clamped = clampWidget(widget, dynamicCols)}
							{#if WidgetComp}
								<div
									style="grid-column: {clamped.x + 1} / span {clamped.span}; grid-row: {widget.position_y + 1} / span {widget.height};"
								>
									<WidgetComp {widget} onItemContext={handleItemContext} />
								</div>
							{/if}
						{/each}
					</div>
				{:else}
					<div class="flex flex-col items-center justify-center gap-2 py-20">
						<p class="text-sm text-[var(--ag-text-muted)]">ウィジェットがまだ追加されていません</p>
						<p class="text-xs text-[var(--ag-text-faint)]">左の編集ボタンを押してウィジェットをドラッグで追加できます</p>
					</div>
				{/if}
			</div>

			{#if contextItemId}
				<div class="w-80 shrink-0">
					<LibraryDetailPanel
						selectedItemId={contextItemId}
						{onEditItem}
						onClose={() => { contextItemId = null; }}
					/>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- ウィジェット削除確認ダイアログ -->
{#if deleteConfirmId}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget) deleteConfirmId = null; }}
		onkeydown={(e) => { if (e.key === 'Escape') deleteConfirmId = null; }}
	>
		<div class="w-full max-w-sm rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] p-6 shadow-[var(--ag-shadow-dialog)]">
			<h3 class="mb-2 text-base font-semibold text-[var(--ag-text-primary)]">ウィジェットを削除しますか？</h3>
			<p class="mb-5 text-sm text-[var(--ag-text-muted)]">この操作は元に戻せません。</p>
			<div class="flex justify-end gap-2">
				<button
					type="button"
					class="rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-4 py-2 text-sm text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]"
					onclick={() => (deleteConfirmId = null)}
				>
					キャンセル
				</button>
				<button
					type="button"
					class="rounded-lg bg-destructive px-4 py-2 text-sm text-white hover:opacity-90"
					onclick={() => {
						if (deleteConfirmId) void workspaceStore.removeWidget(deleteConfirmId);
						deleteConfirmId = null;
					}}
				>
					削除
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ワークスペース名変更ダイアログ -->
{#if renameOpen}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget) renameOpen = false; }}
		onkeydown={(e) => { if (e.key === 'Escape') renameOpen = false; }}
	>
		<div class="w-full max-w-sm rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] p-6 shadow-[var(--ag-shadow-dialog)]">
			<h3 class="mb-4 text-lg font-semibold text-[var(--ag-text-primary)]">ワークスペース名を変更</h3>
			<form onsubmit={(e) => { e.preventDefault(); confirmRename(); }}>
				<!-- svelte-ignore a11y_autofocus -->
				<input
					type="text"
					class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)] placeholder:text-[var(--ag-text-muted)]"
					bind:value={renameValue}
					placeholder="ワークスペース名"
					autofocus
				/>
				<div class="mt-4 flex justify-end gap-2">
					<button
						type="button"
						class="rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-4 py-2 text-sm text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]"
						onclick={() => (renameOpen = false)}
					>
						キャンセル
					</button>
					<button
						type="submit"
						class="rounded-lg bg-[var(--ag-accent)] px-4 py-2 text-sm text-white hover:opacity-90"
					>
						変更
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
