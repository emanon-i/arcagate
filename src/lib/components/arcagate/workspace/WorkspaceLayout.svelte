<script lang="ts">
import {
	LayoutGrid,
	Maximize2,
	PanelLeftOpen,
	Redo2,
	RotateCcw as ResetIcon,
	Undo2,
} from '@lucide/svelte';
import { convertFileSrc } from '@tauri-apps/api/core';
import LibraryDetailPanel from '$lib/components/arcagate/library/LibraryDetailPanel.svelte';
import { configStore } from '$lib/state/config.svelte';
import { itemStore } from '$lib/state/items.svelte';
import { pointerDrag } from '$lib/state/pointer-drag.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { useWidgetZoom } from '$lib/state/widget-zoom.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { workspaceHistory } from '$lib/state/workspace-history.svelte';
import { loadBool, loadJSON, saveBool, saveJSON } from '$lib/utils/local-storage';
import { computeBoundingBox, computeFitScroll, computeOrigin } from '$lib/utils/zoom-math';
import { widgetRegistry } from '$lib/widgets';
import ItemContextMenu from './ItemContextMenu.svelte';
import PageTabBar from './PageTabBar.svelte';
import WorkspaceHintBar from './WorkspaceHintBar.svelte';
import WorkspaceRenameDialog from './WorkspaceRenameDialog.svelte';
import WorkspaceSidebar from './WorkspaceSidebar.svelte';
import WorkspaceWallpaperDialog from './WorkspaceWallpaperDialog.svelte';
import WorkspaceWidgetGrid from './WorkspaceWidgetGrid.svelte';

/**
 * PH-issue-002: Obsidian Canvas 完全実装。
 *
 * 引用元 guideline:
 * - docs/l1_requirements/ux_standards.md §13 Workspace Canvas 編集 UX
 * - docs/l1_requirements/ux_design_vision.md §2-3 モーション 3 原則
 * - docs/desktop_ui_ux_agent_rules.md P5 (OS / Obsidian 慣習) / P2 (Undo) / P10 (熟練者効率)
 * - CLAUDE.md「設定変えたら即見た目が変わる、遅延反映は欠陥」
 *
 * 編集モード撤廃 + 即時保存 + Undo/Redo + Obsidian 入力マッピング全装備:
 * - 通常 wheel: 縦 scroll (ブラウザ標準)
 * - Shift + wheel: 横 scroll (useWidgetZoom 内 handler)
 * - 中ボタン drag: 自由 pan
 * - Space + 左 drag: 自由 pan
 * - Ctrl + wheel: zoom (useWidgetZoom)
 * - Ctrl + 0: zoom 100% リセット
 * - Ctrl + Shift + 1: Fit to content
 * - Ctrl + Z: Undo
 * - Ctrl + Shift + Z / Ctrl + Y: Redo
 * - Delete / Backspace: 選択 widget 削除確認
 * - Esc: 選択解除
 */

interface Props {
	onEditItem?: (id: string) => void;
}

let { onEditItem }: Props = $props();

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
// deleteConfirmId 自体は WidgetHandles の callback shape 互換 + UI 内 transient state として残す。
let deleteConfirmId = $state<string | null>(null);
function consumeDeleteConfirm(id: string | null) {
	if (id) {
		// 即削除を実行。state 更新は記録のみ。
		instantDeleteWidget(id);
	}
	// id を null に戻して transient マーカーを消費 (UI には残さない)。
	deleteConfirmId = null;
}
let contextItemId = $state<string | null>(null);

function instantDeleteWidget(id: string) {
	// 検収 #2: toast 文言から「Ctrl+Z で戻せます」を削除 (注意書き残骸)。Undo は標準操作なので説明不要。
	void workspaceStore.removeWidget(id);
	toastStore.add('ウィジェットを削除しました', 'info');
}
// PH-issue-024: 右クリック「Open with…」 popup の表示状態 + 位置
let contextMenuOpen = $state(false);
let contextMenuX = $state(0);
let contextMenuY = $state(0);
let contextMenuItemId = $state<string | null>(null);
let workspaceContainer = $state<HTMLDivElement | null>(null);
let infiniteCanvas = $state<HTMLDivElement | null>(null);
let containerWidth = $state(0);
// 5/04 user 検収 (post-redo3 #4): 「左端 / 上端の壁」と「初期位置が左上」を解消。
// 修正:
//   - 初期 scroll は grid 中央 (saved 位置がない場合) に変更。widget 群がある場合は widget BB 中央に focus。
//   - grid サイズ自体も MIN_PAN_COLS=24 / MIN_PAN_ROWS=128 に拡大 (中央起点 + 4 方向に広い pan 余裕)。
// pan 位置は **workspace ごと** に永続化 (cross-workspace contamination 防止)。
function panKey(wsId: string | null): string {
	return wsId ? `arcagate.workspace.pan.${wsId}` : 'arcagate.workspace.pan.__default__';
}
let panSaveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 初期 scroll 位置を計算 (Q3 確定: Fit と spec 統一)。
 *   - widget あり: zoom-math.computeFitScroll で BB 重心を viewport visual center に置く
 *   - widget なし: canvas 中央 (grid 全景表示)
 *
 * 旧実装は独自に BB center 計算していたが、Fit の computeFitScroll と spec 重複だったため統一。
 * これで初期表示と Fit ボタンが同じ scroll 計算式を使う。
 */
function computeInitialScroll(el: HTMLElement): { left: number; top: number } {
	const widgets = workspaceStore.widgets;
	if (widgets.length === 0) {
		return {
			left: Math.max(0, (el.scrollWidth - el.clientWidth) / 2),
			top: Math.max(0, (el.scrollHeight - el.clientHeight) / 2),
		};
	}
	const bb = computeBoundingBox(widgets);
	if (!bb) {
		return {
			left: Math.max(0, (el.scrollWidth - el.clientWidth) / 2),
			top: Math.max(0, (el.scrollHeight - el.clientHeight) / 2),
		};
	}
	const origin = computeOrigin(bb);
	const fit = computeFitScroll(origin, configStore.widgetZoom, {
		clientWidth: el.clientWidth,
		clientHeight: el.clientHeight,
	});
	// scrollWidth/Height 上限のみここで適用 (computeFitScroll は下限 0 のみ補正)
	return {
		left: Math.min(el.scrollWidth - el.clientWidth, fit.scrollLeft),
		top: Math.min(el.scrollHeight - el.clientHeight, fit.scrollTop),
	};
}

// active workspace 切替で pan を別 workspace の最後位置に復元 (新規は中央起点)。
// 初回 scroll は **per workspace 1 度だけ** 適用 (widget 配置毎に再 center しない)。
let lastInitializedWorkspaceId = $state<string | null>(null);
$effect(() => {
	const wsId = workspaceStore.activeWorkspaceId;
	const widgets = workspaceStore.widgets; // 依存登録: widgets ロード完了で再 trigger
	if (!workspaceContainer || !infiniteCanvas || !wsId) return;
	if (workspaceStore.loading) return; // widgets ロード中は待機
	if (lastInitializedWorkspaceId === wsId) return;
	lastInitializedWorkspaceId = wsId;
	queueMicrotask(() => {
		if (!workspaceContainer) return;
		const saved = loadJSON<{ left?: number; top?: number }>(panKey(wsId), {});
		if (typeof saved.left === 'number' && typeof saved.top === 'number') {
			workspaceContainer.scrollTo({ left: saved.left, top: saved.top, behavior: 'instant' });
			return;
		}
		// widget が読み込まれている前提で BB / canvas 中央計算
		const _w = widgets; // unused 警告抑制 (依存登録のため reference 必要)
		void _w;
		const init = computeInitialScroll(workspaceContainer);
		workspaceContainer.scrollTo({ left: init.left, top: init.top, behavior: 'instant' });
	});
});
function onWorkspaceScroll() {
	if (!workspaceContainer) return;
	if (panSaveTimer) clearTimeout(panSaveTimer);
	const wsId = workspaceStore.activeWorkspaceId;
	panSaveTimer = setTimeout(() => {
		if (!workspaceContainer) return;
		saveJSON(panKey(wsId), {
			left: workspaceContainer.scrollLeft,
			top: workspaceContainer.scrollTop,
		});
	}, 200);
}

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

// 中ボタン drag / Space + 左 drag (PH-issue-002)
let panActive = $state(false);
let panSpacePressed = $state(false);
let panStart = { x: 0, y: 0, scrollLeft: 0, scrollTop: 0 };

function isEditableTarget(target: EventTarget | null): boolean {
	const el = target as HTMLElement | null;
	return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

$effect(() => {
	function onKeyDown(e: KeyboardEvent) {
		if (e.code !== 'Space') return;
		if (isEditableTarget(e.target)) return;
		e.preventDefault();
		panSpacePressed = true;
		if (workspaceContainer && !panActive) {
			workspaceContainer.style.cursor = 'grab';
		}
	}
	function onKeyUp(e: KeyboardEvent) {
		if (e.code === 'Space') {
			panSpacePressed = false;
			if (workspaceContainer && !panActive) {
				workspaceContainer.style.cursor = '';
			}
		}
	}
	window.addEventListener('keydown', onKeyDown);
	window.addEventListener('keyup', onKeyUp);
	return () => {
		window.removeEventListener('keydown', onKeyDown);
		window.removeEventListener('keyup', onKeyUp);
	};
});

function onCanvasPointerDown(e: PointerEvent) {
	if (!workspaceContainer) return;
	const isMiddle = e.button === 1;
	const isSpaceLeft = e.button === 0 && panSpacePressed;
	if (!isMiddle && !isSpaceLeft) return;
	e.preventDefault();
	panActive = true;
	panStart = {
		x: e.clientX,
		y: e.clientY,
		scrollLeft: workspaceContainer.scrollLeft,
		scrollTop: workspaceContainer.scrollTop,
	};
	workspaceContainer.setPointerCapture(e.pointerId);
	workspaceContainer.style.cursor = 'grabbing';
}

function onCanvasPointerMove(e: PointerEvent) {
	if (!panActive || !workspaceContainer) return;
	workspaceContainer.scrollLeft = panStart.scrollLeft - (e.clientX - panStart.x);
	workspaceContainer.scrollTop = panStart.scrollTop - (e.clientY - panStart.y);
}

function onCanvasPointerUp(e: PointerEvent) {
	if (!panActive || !workspaceContainer) return;
	panActive = false;
	workspaceContainer.releasePointerCapture(e.pointerId);
	workspaceContainer.style.cursor = panSpacePressed ? 'grab' : '';
}

// keyboard: Delete/Backspace (削除) / Esc (選択解除) / Ctrl+Z/Y/0/Shift+1
$effect(() => {
	function onKeyDown(e: KeyboardEvent) {
		if (isEditableTarget(e.target)) return;
		// Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y
		if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
			e.preventDefault();
			void workspaceStore.undo();
			return;
		}
		if (
			(e.ctrlKey || e.metaKey) &&
			((e.shiftKey && e.key.toLowerCase() === 'z') || (!e.shiftKey && e.key.toLowerCase() === 'y'))
		) {
			e.preventDefault();
			void workspaceStore.redo();
			return;
		}
		// Ctrl+0: zoom 100% reset
		if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === '0') {
			e.preventDefault();
			zoom.resetZoom();
			return;
		}
		// Ctrl+Shift+1: Fit to content
		if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '!') {
			// Shift+1 で '!' になる ASCII 環境向け
			e.preventDefault();
			zoom.fitToContent(workspaceStore.widgets);
			return;
		}
		if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '1') {
			e.preventDefault();
			zoom.fitToContent(workspaceStore.widgets);
			return;
		}
		// Esc: 選択解除
		if (e.key === 'Escape' && selectedWidgetId && !renameOpen) {
			e.preventDefault();
			selectedWidgetId = null;
			return;
		}
		// Delete/Backspace: 選択 widget を即削除 (PH-issue-031: 確認 modal 撤廃、Undo で戻せる)
		if (e.key === 'Delete' || e.key === 'Backspace') {
			if (selectedWidgetId && !renameOpen) {
				e.preventDefault();
				const id = selectedWidgetId;
				selectedWidgetId = null;
				instantDeleteWidget(id);
			}
		}
	}
	window.addEventListener('keydown', onKeyDown);
	return () => window.removeEventListener('keydown', onKeyDown);
});

// ウィジェットが占める最大列数
let minGridCols = $derived(
	workspaceStore.widgets.length > 0
		? Math.max(1, ...workspaceStore.widgets.map((w) => w.position_x + w.width))
		: 1,
);

// 5/04 user 検収 (post-redo3 #4): 「左端 / 上端の壁を感じる」 退行。
// MIN_PAN_COLS=12 / 64 では viewport (1920×1080) から pan して数 cells で grid 端に到達、
// 「壁」体感を解消できなかった。grid を **十分広く** 確保し、初期 scroll 中央起点と組合わせて
// user が grid 端に到達するまでに **24 cols × 128 rows** の pan 余裕を持たせる。
// 24 cols × 256 px = 6144 px、128 rows × 151 px = 19328 px (zoom 100% 時)。
// 中央起点なら 4 方向に各 ~3000 / ~9500 px の pan 余裕、user が「壁」を感じない実用上の無限 canvas。
const MIN_PAN_COLS = 24;
const MIN_PAN_ROWS = 128;

let dynamicCols = $derived(
	Math.max(
		minGridCols,
		MIN_PAN_COLS,
		containerWidth > 0 && zoom.widgetW > 0 ? Math.floor(containerWidth / zoom.widgetW) : 4,
	),
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

const widgetComponents = Object.fromEntries(
	Object.entries(widgetRegistry).map(([type, meta]) => [type, meta.Component]),
);

// PH-issue-024: 右クリック → ItemContextMenu popup を表示。
// 旧サイドパネル (LibraryDetailPanel) は popup 内 「詳細を見る」 から開けるように切替。
function handleItemContext(itemId: string, ev?: MouseEvent) {
	contextMenuItemId = itemId;
	contextMenuX = ev?.clientX ?? 0;
	contextMenuY = ev?.clientY ?? 0;
	contextMenuOpen = true;
}

let contextMenuItem = $derived.by(() =>
	contextMenuItemId ? (itemStore.items.find((i) => i.id === contextMenuItemId) ?? null) : null,
);

function openItemDetail(itemId: string) {
	contextItemId = itemId;
	contextMenuOpen = false;
}

// 5/04 user 検収 (post-redo3 #2 + #3): canvas dead zone 解消 + 配置範囲拡大。
//   - canvas size = max(viewport, grid)、padding 0 (旧 6000×6000 + padding 2000 の dead zone 解消)
//   - MIN_PAN_ROWS=64 で空 workspace でも 64 行の drop zone を確保 (旧 32 行は user が「狭い」と感じた)
//   - 初期 scroll = (0, 0)
let maxRow = $derived(
	Math.max(MIN_PAN_ROWS, ...workspaceStore.widgets.map((w) => w.position_y + w.height + 4)),
);

// canvas inner box size (grid 込みの flex container 全体): grid と viewport の大きい方。
// 計算式:
//   gridContentW = dynamicCols × (widgetW + gap) + flex p-5 padding (40)
//   gridContentH = maxRow × (widgetH + gap) + flex p-5 padding (40)
//   gap = 16 (WorkspaceWidgetGrid の grid gap)
const FLEX_PADDING = 40; // p-5 = 20px × 2
const GRID_GAP = 16;
let containerHeight = $state(0);
$effect(() => {
	const el = workspaceContainer;
	if (!el) return;
	containerHeight = el.clientHeight;
	const ro = new ResizeObserver((entries) => {
		for (const entry of entries) {
			containerHeight = entry.contentRect.height;
		}
	});
	ro.observe(el);
	return () => ro.disconnect();
});
let canvasW = $derived(
	Math.max(containerWidth, dynamicCols * (zoom.widgetW + GRID_GAP) + FLEX_PADDING),
);
let canvasH = $derived(
	Math.max(containerHeight, maxRow * (zoom.widgetH + GRID_GAP) + FLEX_PADDING),
);
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

<!-- R6-2: Workspace 全体を Industrial Yellow scope に。
     focus-visible ring / selected state / accent-bg / active-bg を yellow に re-bind。
     widget focus 経路もすべて Industrial 化される。 -->
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

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- PH-issue-029 / 検収項目 #6/#7/#8: 上部 PageTabBar + 壁紙 layer を canvas の外に出す。
	     pan で動くのは widget grid のみ、PageTabBar / 壁紙 / 右下 toolbar / HintBar は固定。 -->
	<!-- 4/30 user 検収: wallpaper 未設定時の fallback gradient を column 自体に置く。
	     canvas-edit-mode は透明、wallpaper layer (z-0) があれば最前で見え、無ければこの gradient が見える。 -->
	<div
		class="relative flex min-w-0 flex-1 flex-col overflow-hidden"
		style="background: linear-gradient(180deg,var(--ag-surface-0) 0%,var(--ag-surface-page) 100%);"
	>
		<!-- 壁紙: 親 (この column) を覆う、scroll しない最背景 -->
		{#if workspaceStore.activeWorkspace?.wallpaper_path}
			{@const ws = workspaceStore.activeWorkspace}
			{@const wpUrl = convertFileSrc(ws.wallpaper_path ?? '')}
			<div
				class="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat motion-reduce:!filter-none"
				style="background-image: url('{wpUrl}'); opacity: {ws.wallpaper_opacity}; filter: blur({ws.wallpaper_blur}px);"
				aria-hidden="true"
				data-testid="workspace-wallpaper"
			></div>
		{/if}

		<!-- 上部 toolbar: PageTabBar (workspace 切替 + 壁紙設定 button)。
		     検収 #11: 背景色削除 (透明)、border のみ残す。wallpaper / canvas 背景がそのまま透けて見える。 -->
		<div
			class="relative z-20 shrink-0 border-b border-[var(--ag-border)] px-5 py-3"
		>
			<PageTabBar
				onSelectWorkspace={handleSelectWorkspace}
				onRenameActive={() => (renameOpen = true)}
				onEditWallpaper={() => (wallpaperOpen = true)}
			/>
		</div>

		<!-- Canvas: widget grid のみが scroll/pan 可能。
		     PH-issue-034 / 検収項目 #9: Obsidian Canvas のように上下左右無限パン。
		     overflow-auto + 内側に大きな infinite-canvas div (5000x5000 + 周囲 padding) を置き、
		     初期 scroll を中央付近に置く → user は 4 方向 pan 可能。widget なしでも pan 可能。
		     dotted grid 背景は infinite-canvas に置くので scroll に追従 (Obsidian と一致)。 -->
		<!-- 4/30 user 検収: canvas-edit-mode の linear-gradient 背景が wallpaper layer (z-0) を
		     完全に覆っていたため、wallpaper が user の意図する場所 (canvas 背景) に出ていなかった。
		     ここを透明にして wallpaper / 既定 surface を透けて見せる。
		     wallpaper 未設定時の surface gradient は **ラッパー column** に移して fallback。 -->
		<div
			class="canvas-edit-mode relative z-10 min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]"
			style="--widget-w: {zoom.widgetW}px; --widget-h: {zoom.widgetH}px; background: transparent;"
			data-zoom={configStore.widgetZoom}
			bind:this={workspaceContainer}
			onpointerdown={onCanvasPointerDown}
			onpointermove={onCanvasPointerMove}
			onpointerup={onCanvasPointerUp}
			onscroll={onWorkspaceScroll}
		>
			<!-- 5/04 user 検収 (post-redo3 #2): canvas size = max(viewport, grid)、padding 0。
			     旧 6000×6000 + padding 2000 は dead zone (左/上/右 2020px ずつ) を生み、
			     pan して dead zone に click → drop fail を起こしていた。
			     新 canvas は grid と viewport の大きい方に揃え、見える範囲 = 配置可能範囲を保証。 -->
			<div
				class="relative"
				style="width: {canvasW}px; height: {canvasH}px; background-image: radial-gradient(circle, rgba(128,128,128,0.22) 1.5px, transparent 1.5px); background-size: 24px 24px;"
				bind:this={infiniteCanvas}
			>
				<div class="flex gap-4 p-5">
					<div class="relative min-w-0 flex-1">
						<!-- 検収 #6: WorkspaceWidgetGrid は **常時** 描画する。
						     旧実装では `widgets.length === 0` のとき grid が unmount されており、
						     その間に sidebar pointerdown で pointerDrag.start しても、grid の document
						     listener が無いため pointerup で addWidget が呼ばれず click 追加が失敗していた。
						     空状態のヒントは grid の上に absolute オーバーレイで表示する (pointer-events-none)。 -->
						<WorkspaceWidgetGrid
							{dynamicCols}
							{maxRow}
							widgetW={zoom.widgetW}
							widgetH={zoom.widgetH}
							{widgetComponents}
							{selectedWidgetId}
							{deleteConfirmId}
							editMode={true}
							onItemContext={handleItemContext}
							onSelectedWidgetIdChange={(id) => (selectedWidgetId = id)}
							onDeleteConfirmIdChange={consumeDeleteConfirm}
						/>
						{#if workspaceStore.widgets.length === 0}
							<div
								class="pointer-events-none absolute inset-x-0 top-12 flex flex-col items-center justify-center gap-2 text-center"
							>
								<LayoutGrid class="h-12 w-12 text-[var(--ag-text-faint)]" />
								<p class="text-sm font-medium text-[var(--ag-text-secondary)]">
									ウィジェットを追加しましょう
								</p>
								<p class="max-w-md text-xs text-[var(--ag-text-muted)]">
									左のサイドバーから widget を選んでドラッグ、もしくはクリックで追加できます。
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
	</div>

	<!-- PH-issue-024: 右クリック context menu (Open with…) -->
	<ItemContextMenu
		open={contextMenuOpen}
		x={contextMenuX}
		y={contextMenuY}
		item={contextMenuItem}
		onClose={() => (contextMenuOpen = false)}
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
