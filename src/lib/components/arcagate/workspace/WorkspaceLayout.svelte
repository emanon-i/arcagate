<script lang="ts">
import { Maximize2, PanelLeftOpen, Redo2, RotateCcw as ResetIcon, Undo2 } from '@lucide/svelte';
import { configStore } from '$lib/state/config.svelte';
import { itemStore } from '$lib/state/items.svelte';
import { pointerDrag } from '$lib/state/pointer-drag.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { useWidgetZoom } from '$lib/state/widget-zoom.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { workspaceContextMenuStore } from '$lib/state/workspace-context-menu.svelte';
import { workspaceHistory } from '$lib/state/workspace-history.svelte';
import { useWorkspaceInput } from '$lib/state/workspace-input.svelte';
import { loadBool, saveBool } from '$lib/utils/local-storage';
import ItemContextMenu from './ItemContextMenu.svelte';
import WorkspaceGrid from './WorkspaceGrid.svelte';
import WorkspaceHintBar from './WorkspaceHintBar.svelte';
import WorkspaceRenameDialog from './WorkspaceRenameDialog.svelte';
import WorkspaceSidebar from './WorkspaceSidebar.svelte';
import WorkspaceUndoSnackbar from './WorkspaceUndoSnackbar.svelte';
import WorkspaceWallpaperDialog from './WorkspaceWallpaperDialog.svelte';

/**
 * PH-issue-002: Obsidian Canvas 完全実装の facade。
 *
 * 引用元 guideline:
 * - docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、666 LOC を 4 に分割)
 * - docs/l1_requirements/ux-standards.md §13 Workspace Canvas 編集 UX
 * - docs/desktop-ui-rules.md P5 (OS / Obsidian 慣習) / P2 (Undo) / P10 (熟練者効率)
 *
 * 編集モード撤廃 + 即時保存 + Undo/Redo + Obsidian 入力マッピング全装備:
 * - 通常 wheel: 縦 scroll (ブラウザ標準)
 * - Shift + wheel: 横 scroll (useWidgetZoom 内 handler)
 * - 中ボタン drag: 自由 pan (workspace-input hook)
 * - Space + 左 drag: 自由 pan (workspace-input hook)
 * - Ctrl + wheel: zoom (useWidgetZoom)
 * - Ctrl + 0: zoom 100% リセット
 * - Ctrl + Shift + 1: Fit to content
 * - Ctrl + Z: Undo / Ctrl + Shift + Z / Ctrl + Y: Redo
 * - Delete / Backspace: 選択 widget 削除
 * - Esc: 選択解除
 *
 * 子 component:
 * - WorkspaceGrid (canvas + 壁紙 + PageTabBar + WorkspaceWidgetGrid + LibraryDetailPanel)
 * - WorkspaceSidebar (widget 一覧)
 * - WorkspaceHintBar / ItemContextMenu / 右下 toolbar / 各種 dialog
 *
 * hook / store:
 * - useWidgetZoom (zoom 制御)
 * - useWorkspaceInput (pan + keyboard shortcut)
 * - workspaceContextMenuStore (右クリック menu state)
 */

interface Props {
	onEditItem?: (id: string) => void;
}

let { onEditItem }: Props = $props();

let workspaceContainer = $state<HTMLDivElement | null>(null);
const zoom = useWidgetZoom(() => workspaceContainer);

$effect(() => {
	void workspaceStore.loadWorkspaces();
});

let selectedWidgetId = $state<string | null>(null);
let renameOpen = $state(false);
let wallpaperOpen = $state(false);

// PH-issue-028 / 検収項目 #1 + Codex Low #8: sidebar 開閉状態を safe helper 経由で永続化。
const SIDEBAR_KEY = 'arcagate.workspace.sidebar.open';
let sidebarOpen = $state<boolean>(loadBool(SIDEBAR_KEY, true));
$effect(() => {
	saveBool(SIDEBAR_KEY, sidebarOpen);
});

// PH-issue-031 / 検収項目 #5: 削除確認 modal 撤廃、即削除 + Undo toast。
// 4/30 user 検収 retrospective (致命的 regression): WidgetHandles の × button が
// `onDeleteConfirmIdChange(id)` を呼ぶのに parent で受け取った id を消費せず
// **削除されないまま放置されていた**。$effect 経由は再発火 / loop の罠が多い (toast spam を
// 起こした) ため、callback が直接 instantDeleteWidget を呼ぶように変更。
let deleteConfirmId = $state<string | null>(null);
function consumeDeleteConfirm(id: string | null) {
	if (id) {
		instantDeleteWidget(id);
	}
	deleteConfirmId = null;
}

function instantDeleteWidget(id: string) {
	// 検収 #2: toast 文言から「Ctrl+Z で戻せます」を削除。Undo は標準操作なので説明不要。
	void workspaceStore.removeWidget(id);
	toastStore.add('ウィジェットを削除しました', 'info');
}

// canvas size tracking (Sidebar の widget 配置 bound と Grid の canvas size 両方で必要)
let containerWidth = $state(0);
let containerHeight = $state(0);
$effect(() => {
	const el = workspaceContainer;
	if (!el) return;
	containerWidth = el.clientWidth;
	containerHeight = el.clientHeight;
	const ro = new ResizeObserver((entries) => {
		for (const entry of entries) {
			containerWidth = entry.contentRect.width;
			containerHeight = entry.contentRect.height;
		}
	});
	ro.observe(el);
	return () => ro.disconnect();
});

// 5/04 user 検収 (post-redo3 #4): 24 cols × 128 rows の pan 余裕で「壁」体感を解消。
const MIN_PAN_COLS = 24;
const MIN_PAN_ROWS = 128;

let minGridCols = $derived(
	workspaceStore.widgets.length > 0
		? Math.max(1, ...workspaceStore.widgets.map((w) => w.position_x + w.width))
		: 1,
);

let dynamicCols = $derived(
	Math.max(
		minGridCols,
		MIN_PAN_COLS,
		containerWidth > 0 && zoom.widgetW > 0 ? Math.floor(containerWidth / zoom.widgetW) : 4,
	),
);

let maxRow = $derived(
	Math.max(MIN_PAN_ROWS, ...workspaceStore.widgets.map((w) => w.position_y + w.height + 4)),
);

const input = useWorkspaceInput({
	getContainer: () => workspaceContainer,
	getSelectedId: () => selectedWidgetId,
	setSelectedId: (id) => {
		selectedWidgetId = id;
	},
	isModalOpen: () => renameOpen,
	onDelete: instantDeleteWidget,
	zoom,
});

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
</script>

<!-- Pointer drag ghost -->
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

<!-- R6-2: Workspace 全体を Industrial Yellow scope に。 -->
<div class="il-zone relative flex h-full" data-il-zone>
	<WorkspaceHintBar editMode={true} {selectedWidgetId} />

	{#if sidebarOpen}
		<WorkspaceSidebar {dynamicCols} onClose={() => (sidebarOpen = false)} />
	{:else}
		<!-- PH-issue-028: sidebar 非表示時は左端に再オープン用 narrow toggle bar -->
		<button
			type="button"
			class="flex h-full w-7 shrink-0 items-center justify-center border-r border-[var(--ag-border)] bg-[var(--ag-surface-2)] text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)]"
			aria-label="ウィジェットパネルを開く"
			title="ウィジェットを追加"
			onclick={() => (sidebarOpen = true)}
		>
			<PanelLeftOpen class="h-4 w-4" />
		</button>
	{/if}

	<WorkspaceGrid
		bind:container={workspaceContainer}
		{containerWidth}
		{containerHeight}
		{dynamicCols}
		{maxRow}
		{selectedWidgetId}
		{deleteConfirmId}
		{zoom}
		{onEditItem}
		onSelectWorkspace={handleSelectWorkspace}
		onRenameActive={() => (renameOpen = true)}
		onEditWallpaper={() => (wallpaperOpen = true)}
		onSelectedWidgetIdChange={(id) => (selectedWidgetId = id)}
		onDeleteConfirmIdChange={consumeDeleteConfirm}
		onCanvasPointerDown={input.onPointerDown}
		onCanvasPointerMove={input.onPointerMove}
		onCanvasPointerUp={input.onPointerUp}
	/>

	<!-- PH-issue-024: 右クリック context menu (Open with…) -->
	<ItemContextMenu
		open={workspaceContextMenuStore.open}
		x={workspaceContextMenuStore.x}
		y={workspaceContextMenuStore.y}
		item={workspaceContextMenuStore.item}
		onClose={() => workspaceContextMenuStore.close()}
		onItemUpdated={() => {
			void itemStore.loadItems();
		}}
	/>

	<!-- 右下 floating toolbar (Undo / Redo / zoom% / Reset / Fit)。
	     PH-widget-polish: title 属性で keyboard shortcut tooltip、cursor-pointer / cursor-not-allowed、
	     active:scale-[0.97] で触覚フィードバック (P1 操作可視化、P2 反応即時)。 -->
	<div
		class="absolute bottom-4 right-4 z-30 flex items-center gap-1 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-1)] px-2 py-1 shadow-[var(--ag-shadow-md,0_4px_12px_rgba(0,0,0,0.15))]"
		data-testid="canvas-toolbar"
	>
		<button
			type="button"
			class="rounded p-1.5 text-[var(--ag-text-secondary)] transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] motion-reduce:transition-none active:scale-[0.95] hover:bg-[var(--ag-surface-2)] hover:text-[var(--ag-text-primary)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--ag-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
			aria-label="元に戻す"
			title="元に戻す (Ctrl+Z)"
			disabled={!workspaceHistory.canUndo}
			onclick={() => void workspaceStore.undo()}
		>
			<Undo2 class="h-4 w-4" />
		</button>
		<button
			type="button"
			class="rounded p-1.5 text-[var(--ag-text-secondary)] transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] motion-reduce:transition-none active:scale-[0.95] hover:bg-[var(--ag-surface-2)] hover:text-[var(--ag-text-primary)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--ag-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
			aria-label="やり直し"
			title="やり直し (Ctrl+Y / Ctrl+Shift+Z)"
			disabled={!workspaceHistory.canRedo}
			onclick={() => void workspaceStore.redo()}
		>
			<Redo2 class="h-4 w-4" />
		</button>

		<div class="mx-1 h-5 w-px bg-[var(--ag-border)]" aria-hidden="true"></div>

		<button
			type="button"
			class="rounded p-1.5 text-[var(--ag-text-secondary)] transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] motion-reduce:transition-none active:scale-[0.95] hover:bg-[var(--ag-surface-2)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
			aria-label="拡大率を 100% にリセット"
			title="100% にリセット (Ctrl+0)"
			onclick={() => zoom.resetZoom()}
		>
			<ResetIcon class="h-4 w-4" />
		</button>
		<span
			class="select-none px-1 text-xs tabular-nums text-[var(--ag-text-muted)]"
			data-testid="zoom-percent"
			title="現在の拡大率 (Ctrl+wheel で変更)"
		>
			{configStore.widgetZoom}%
		</span>
		<button
			type="button"
			class="rounded p-1.5 text-[var(--ag-text-secondary)] transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] motion-reduce:transition-none active:scale-[0.95] hover:bg-[var(--ag-surface-2)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
			aria-label="全体を表示"
			title="全体を表示 (Ctrl+Shift+1)"
			onclick={() => zoom.fitToContent(workspaceStore.widgets)}
		>
			<Maximize2 class="h-4 w-4" />
		</button>
	</div>
</div>

<!-- PH-issue-031 / 検収項目 #5: 削除確認 dialog 撤廃 (Undo で戻せるため) -->

<WorkspaceRenameDialog
	open={renameOpen}
	currentName={currentWorkspaceName}
	onConfirm={confirmRename}
	onCancel={() => (renameOpen = false)}
/>

<WorkspaceWallpaperDialog
	open={wallpaperOpen}
	workspace={workspaceStore.activeWorkspace}
	onClose={() => (wallpaperOpen = false)}
/>

<!-- R8-3: widget delete 直後 5 秒間「元に戻す」snackbar (Library と同型 UX) -->
<WorkspaceUndoSnackbar />

<style>
/* R6-2: Industrial Yellow scope。Settings / Onboarding と同じ token re-bind。 */
.il-zone {
	--ag-accent: var(--ag-il-yellow);
	--ag-accent-text: var(--ag-il-on-yellow);
	--ag-accent-bg: color-mix(in srgb, var(--ag-il-yellow) 12%, transparent);
	--ag-accent-border: color-mix(in srgb, var(--ag-il-yellow) 40%, transparent);
	--ag-accent-active-bg: color-mix(in srgb, var(--ag-il-yellow) 18%, transparent);
	--ag-accent-active-border: color-mix(in srgb, var(--ag-il-yellow) 50%, transparent);
}
</style>
