<script lang="ts">
import { Maximize2, PanelLeftOpen, Redo2, RotateCcw as ResetIcon, Undo2 } from '@lucide/svelte';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';
import { configStore } from '$lib/state/config.svelte';
import { itemStore } from '$lib/state/items.svelte';
import { pointerDrag } from '$lib/state/pointer-drag.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { useWidgetZoom } from '$lib/state/widget-zoom.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { workspaceContextMenuStore } from '$lib/state/workspace-context-menu.svelte';
import { workspaceHistory } from '$lib/state/workspace-history.svelte';
import { useWorkspaceInput } from '$lib/state/workspace-input.svelte';
import { workspaceSelection } from '$lib/state/workspace-selection.svelte';
import { loadBool, saveBool } from '$lib/utils/local-storage';
import {
	cellStrideX,
	cellStrideY,
	computeRenderExtent,
	HINT_BAR_RESERVE,
	INNER_PAD,
} from '$lib/utils/zoom-math';
import WidgetItemContextMenu from '$lib/widgets/_shared/WidgetItemContextMenu.svelte';
import WorkspaceGrid from './WorkspaceGrid.svelte';
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

// Codex P2 fix: WorkspaceLayout unmount 時に context menu store を close する。
// store 化により page lifecycle を超えて state が永続化されるため、menu open 中に workspace を
// 離れて戻ると stale menu が re-render される regression を防ぐ。
$effect(() => {
	return () => {
		workspaceContextMenuStore.close();
	};
});

// H-2 Tier B (2026-05-09 user 検収): selection は workspaceSelection store (Set<string>) に
// 移行。HintBar や input hooks は単選択時の id を選択 store の `singleId` で取得。
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
	toastStore.add(t('toast.widget_deleted'), 'info');
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

// 2026-05-19 無限 canvas: grid 範囲は widget 群の BB + 全方位 MARGIN_CELLS で動的に決まる。
// widget を端へ移動すると extent が伸び margin が再展開されるため上下左右どこへでも配置できる。
let extent = $derived(computeRenderExtent(workspaceStore.widgets));

/**
 * 現在 viewport 中央の絶対 grid cell 座標を返す (widget が無い / container 未取得なら null)。
 * sidebar の keyboard add や canvas 外 release 時の widget 配置 seed として使う。
 */
function viewportCenterCell(): { x: number; y: number } | null {
	const el = workspaceContainer;
	if (!el) return null;
	const sx = cellStrideX(configStore.widgetZoom);
	const sy = cellStrideY(configStore.widgetZoom);
	const cx = el.scrollLeft + el.clientWidth / 2;
	const cy = el.scrollTop + el.clientHeight / 2;
	return {
		x: Math.floor(extent.originX + (cx - INNER_PAD) / sx),
		y: Math.floor(extent.originY + (cy - INNER_PAD) / sy),
	};
}

const input = useWorkspaceInput({
	getContainer: () => workspaceContainer,
	getSelectedId: () => workspaceSelection.singleId,
	setSelectedId: (id) => {
		if (id) workspaceSelection.setSingle(id);
		else workspaceSelection.clear();
	},
	// image-widget-critical fix (2026-05-13): renameOpen 単独だと WidgetSettingsDialog /
	// WorkspaceWallpaperDialog 等の modal が開いている時 Ctrl+A / Delete / Backspace 等の
	// shortcut が widget に届いて誤動作 (一括選択 / 削除等)。 DOM の [role="dialog"] が
	// 存在すれば modal open 判定。
	isModalOpen: () => {
		if (renameOpen || wallpaperOpen) return true;
		return typeof document !== 'undefined' && !!document.querySelector('[role="dialog"]');
	},
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

<!-- B-6 #1: il-zone scope 撤去。selection / accent は theme accent (--ag-accent) 追従。
     Industrial Yellow design 自体 (panel / hatch / dot / bracket) は keep、
     selection 色だけ theme に連動させる方針。 -->
<div class="relative flex h-full">
	{#if sidebarOpen}
		<WorkspaceSidebar getSeedCell={viewportCenterCell} onClose={() => (sidebarOpen = false)} />
	{:else}
		<!-- PH-issue-028: sidebar 非表示時は左端に再オープン用 narrow toggle bar -->
		<button
			type="button"
			class="flex h-full w-7 shrink-0 items-center justify-center border-r border-[var(--ag-border)] bg-[var(--ag-surface-2)] text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)]"
			aria-label={t('workspace.tooltip.open_panel')}
			title={t('workspace.add_widget')}
			onclick={() => (sidebarOpen = true)}
		>
			<PanelLeftOpen class="h-4 w-4" />
		</button>
	{/if}

	<WorkspaceGrid
		bind:container={workspaceContainer}
		{containerWidth}
		{containerHeight}
		{extent}
		{deleteConfirmId}
		{zoom}
		{onEditItem}
		onSelectWorkspace={handleSelectWorkspace}
		onRenameActive={() => (renameOpen = true)}
		onEditWallpaper={() => (wallpaperOpen = true)}
		onDeleteConfirmIdChange={consumeDeleteConfirm}
		onCanvasPointerDown={input.onPointerDown}
		onCanvasPointerMove={input.onPointerMove}
		onCanvasPointerUp={input.onPointerUp}
		boxSelectState={input.boxSelectState}
	/>

	<!-- I-2 (2026-05-10 user 検収): 全 widget 共通 context menu (パスをコピー / Explorer で開く /
	     アイテム削除 / 設定を開く)。旧 ItemContextMenu (Opener 専用) を置換。 -->
	<WidgetItemContextMenu
		open={workspaceContextMenuStore.open}
		x={workspaceContextMenuStore.x}
		y={workspaceContextMenuStore.y}
		path={workspaceContextMenuStore.path}
		itemId={workspaceContextMenuStore.itemId}
		widgetId={workspaceContextMenuStore.widgetId}
		onOpenSettings={workspaceContextMenuStore.onOpenSettings}
		onClose={() => workspaceContextMenuStore.close()}
	/>

	<!-- 右下 floating toolbar (Undo / Redo / zoom% / Reset / Fit)。
	     PH-widget-polish: title 属性で keyboard shortcut tooltip、cursor-pointer / cursor-not-allowed、
	     active:scale-[0.97] で触覚フィードバック (P1 操作可視化、P2 反応即時)。 -->
	<!-- 2026-05-17 user 検収: ヒントバー表示時は toolbar をその高さ分上へずらして重なりを回避。 -->
	<div
		class="absolute right-4 z-30 flex items-center gap-1 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-1)] px-2 py-1 shadow-[var(--ag-shadow-md,0_4px_12px_rgba(0,0,0,0.15))]"
		style="bottom: {configStore.hintBarVisible ? HINT_BAR_RESERVE + 8 : 16}px;"
		data-testid="canvas-toolbar"
	>
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			aria-label={t('workspace.tooltip.undo')}
			title={t('workspace.tooltip.undo_full')}
			disabled={!workspaceHistory.canUndo}
			onclick={() => void workspaceStore.undo()}
		>
			<Undo2 class="h-4 w-4" />
		</Button>
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			aria-label={t('workspace.tooltip.redo')}
			title={t('workspace.tooltip.redo_full')}
			disabled={!workspaceHistory.canRedo}
			onclick={() => void workspaceStore.redo()}
		>
			<Redo2 class="h-4 w-4" />
		</Button>

		<div class="mx-1 h-5 w-px bg-[var(--ag-border)]" aria-hidden="true"></div>

		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			aria-label={t('workspace.tooltip.reset_zoom')}
			title={t('workspace.tooltip.reset_zoom_short')}
			onclick={() => zoom.resetZoom()}
		>
			<ResetIcon class="h-4 w-4" />
		</Button>
		<span
			class="select-none px-1 text-xs tabular-nums text-[var(--ag-text-muted)]"
			data-testid="zoom-percent"
			title={t('workspace.tooltip.current_zoom')}
		>
			{configStore.widgetZoom}%
		</span>
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			aria-label={workspaceSelection.size > 0
				? t('workspace.tooltip.fit_selected')
				: t('workspace.tooltip.fit_all')}
			title={workspaceSelection.size > 0
				? t('workspace.tooltip.fit_selected_n', { count: workspaceSelection.size })
				: t('workspace.tooltip.fit_all_full')}
			onclick={() => {
				// U-8 (2026-05-12 user 検収): 選択中 widget があればその範囲だけ fit、
				// 無ければ全 widget を fit (既存挙動)。
				const target =
					workspaceSelection.size > 0
						? workspaceStore.widgets.filter((w) => workspaceSelection.has(w.id))
						: workspaceStore.widgets;
				zoom.fitToContent(target, extent);
			}}
		>
			<Maximize2 class="h-4 w-4" />
		</Button>
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

