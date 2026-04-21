<script lang="ts">
import { GripVertical, Trash2 } from '@lucide/svelte';
import Tip from '$lib/components/arcagate/common/Tip.svelte';
import LibraryDetailPanel from '$lib/components/arcagate/library/LibraryDetailPanel.svelte';
import { configStore } from '$lib/state/config.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import type { WidgetType } from '$lib/types/workspace';
import FavoritesWidget from './FavoritesWidget.svelte';
import PageTabBar from './PageTabBar.svelte';
import ProjectsWidget from './ProjectsWidget.svelte';
import RecentLaunchesWidget from './RecentLaunchesWidget.svelte';
import WorkspaceSidebar from './WorkspaceSidebar.svelte';

interface Props {
	onOpenSettings?: () => void;
	onEditItem?: (id: string) => void;
}

let { onOpenSettings, onEditItem }: Props = $props();

// Base widget dimensions (at 100% zoom)
const BASE_W = 320;
const BASE_H = 180;
const MAX_SPAN = 4;

// Computed pixel sizes from zoom
let widgetW = $derived(Math.round(BASE_W * (configStore.widgetZoom / 100)));
let widgetH = $derived(Math.round(BASE_H * (configStore.widgetZoom / 100)));

$effect(() => {
	void workspaceStore.loadWorkspaces();
});

let editMode = $state(false);
let dragOverCell = $state<{ x: number; y: number } | null>(null);
let resizingWidget = $state<string | null>(null);
let movingWidget = $state<string | null>(null);
let dropZone = $state<HTMLDivElement | null>(null);
let renameOpen = $state(false);
let renameValue = $state('');
// S-6-6: Right-click detail panel
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
}

function confirmEdit() {
	editMode = false;
}

function cancelEdit() {
	editMode = false;
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

// S-6-6: Handle right-click on items in widgets
function handleItemContext(itemId: string) {
	contextItemId = itemId;
}

// S-6-2: Ctrl+wheel zoom handler
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

// S-7-2: Calculate grid position from drop coordinates
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

function handleResizeStart(e: PointerEvent, widgetId: string) {
	e.preventDefault();
	const handle = e.currentTarget as HTMLElement;
	handle.setPointerCapture(e.pointerId);
	resizingWidget = widgetId;

	const startX = e.clientX;
	const startY = e.clientY;
	const widget = workspaceStore.widgets.find((w) => w.id === widgetId);
	if (!widget) return;
	const startW = widget.width;
	const startH = widget.height;

	function onMove(ev: PointerEvent) {
		const dx = ev.clientX - startX;
		const dy = ev.clientY - startY;
		const newW = Math.max(1, Math.min(MAX_SPAN, startW + Math.round(dx / widgetW)));
		const newH = Math.max(1, Math.min(MAX_SPAN, startH + Math.round(dy / widgetH)));
		workspaceStore.optimisticResize(widgetId, newW, newH);
	}

	function onUp(ev: PointerEvent) {
		handle.releasePointerCapture(ev.pointerId);
		resizingWidget = null;
		const w = workspaceStore.widgets.find((ww) => ww.id === widgetId);
		if (w) void workspaceStore.resizeWidget(widgetId, w.width, w.height);
		handle.removeEventListener('pointermove', onMove);
		handle.removeEventListener('pointerup', onUp);
	}

	handle.addEventListener('pointermove', onMove);
	handle.addEventListener('pointerup', onUp);
}

// Imperative dragstart action for widget move (same pattern as dropZone listeners)
function dragMoveWidget(node: HTMLElement, widgetId: string) {
	let handler = (e: DragEvent) => {
		e.dataTransfer?.setData('widget-move-id', widgetId);
		movingWidget = widgetId;
	};
	node.addEventListener('dragstart', handler);
	return {
		update(newId: string) {
			node.removeEventListener('dragstart', handler);
			handler = (e: DragEvent) => {
				e.dataTransfer?.setData('widget-move-id', newId);
				movingWidget = newId;
			};
			node.addEventListener('dragstart', handler);
		},
		destroy() {
			node.removeEventListener('dragstart', handler);
		},
	};
}

/** Clamp widget x / span to fit within the dynamic grid columns */
function clampWidget(widget: { position_x: number; width: number }, cols: number) {
	const x = Math.min(widget.position_x, Math.max(0, cols - 1));
	const span = Math.max(1, Math.min(widget.width, cols - x));
	return { x, span };
}

// Compute grid rows needed
let maxRow = $derived(Math.max(3, ...workspaceStore.widgets.map((w) => w.position_y + w.height)));
</script>

<div class="flex h-full">
	<WorkspaceSidebar
		{editMode}
		onToggleEdit={startEdit}
		onConfirmEdit={confirmEdit}
		onCancelEdit={cancelEdit}
		onOpenSettings={() => onOpenSettings?.()}
	/>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="min-w-0 flex-1 overflow-auto bg-[linear-gradient(180deg,var(--ag-surface-0)_0%,var(--ag-surface-page)_100%)] p-5"
		style="--widget-w: {widgetW}px; --widget-h: {widgetH}px;"
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
							ドラッグ&ドロップでウィジェットを移動、右下のハンドルでリサイズ、ゴミ箱アイコンで削除できます。
						</Tip>
					</div>

					<!-- L-3: Grid with overlay -->
					<div
						class="relative"
						data-testid="workspace-drop-zone"
						bind:this={dropZone}
					>
						<!-- Grid lines overlay (in flow — defines drop zone height) -->
						<div
							class="pointer-events-none"
							style="display: grid; grid-template-columns: repeat({dynamicCols}, var(--widget-w)); grid-auto-rows: var(--widget-h); gap: 16px;"
						>
							{#each Array(dynamicCols * maxRow) as _, i}
								<div class="border border-dashed border-[var(--ag-border)]/30"></div>
							{/each}
						</div>

						<!-- Widget grid (absolute overlay on top of grid lines) -->
						<div
							class="absolute inset-0 z-10"
							style="display: grid; grid-template-columns: repeat({dynamicCols}, var(--widget-w)); grid-auto-rows: var(--widget-h); gap: 16px;"
						>
							{#each workspaceStore.widgets as widget (widget.id)}
								{@const WidgetComp = widgetComponents[widget.widget_type as keyof typeof widgetComponents]}
								{@const clamped = clampWidget(widget, dynamicCols)}
								{#if WidgetComp}
									<div
										class="relative transition-opacity"
										class:opacity-60={movingWidget === widget.id}
										role="group"
										aria-label={widget.widget_type}
										style="grid-column: {clamped.x + 1} / span {clamped.span}; grid-row: {widget.position_y + 1} / span {widget.height};"
									>
										<WidgetComp {widget} onItemContext={handleItemContext} />
										<!-- ドラッグハンドル -->
										<div
											class="absolute left-1 top-1 flex h-6 w-6 cursor-grab items-center justify-center rounded-sm bg-[var(--ag-surface-4)]/80 hover:bg-[var(--ag-surface-4)]"
											draggable="true"
											use:dragMoveWidget={widget.id}
											aria-label="ウィジェットを移動"
											ondragstart={(e) => e.stopPropagation()}
										>
											<GripVertical class="h-3 w-3 text-[var(--ag-text-muted)]" />
										</div>
										<!-- 削除ボタン -->
										<button
											type="button"
											class="absolute right-1 top-1 rounded-full bg-destructive/80 p-1 text-white hover:bg-destructive"
											aria-label="ウィジェットを削除"
											onclick={() => void workspaceStore.removeWidget(widget.id)}
										>
											<Trash2 class="h-3 w-3" />
										</button>
										<!-- svelte-ignore a11y_no_static_element_interactions -->
										<!-- L-4: Resize handle -->
										<div
											class="absolute bottom-1 right-1 flex h-5 w-5 cursor-se-resize items-center justify-center rounded-sm bg-[var(--ag-accent)]/40 shadow-sm hover:bg-[var(--ag-accent)]/80"
											aria-label="リサイズ"
											onpointerdown={(e) => handleResizeStart(e, widget.id)}
											ondragstart={(e) => { e.preventDefault(); e.stopPropagation(); }}
										>
											<GripVertical class="h-3 w-3 text-white/70" />
										</div>
									</div>
								{/if}
							{/each}

							<!-- Drop zone highlight -->
							{#if dragOverCell}
								<div
									class="pointer-events-none rounded-lg border-2 border-dashed border-[var(--ag-accent)] bg-[var(--ag-accent)]/10"
									style="grid-column: {dragOverCell.x + 1}; grid-row: {dragOverCell.y + 1};"
								></div>
							{/if}
						</div>
					</div>
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
					<div class="flex items-center justify-center py-20">
						<p class="text-sm text-[var(--ag-text-muted)]">ワークスペースがまだありません</p>
					</div>
				{/if}
			</div>

			<!-- S-6-6: Right-click detail panel -->
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
