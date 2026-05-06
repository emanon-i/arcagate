<script lang="ts">
import { LayoutGrid } from '@lucide/svelte';
import { convertFileSrc } from '@tauri-apps/api/core';
import LibraryDetailPanel from '$lib/components/arcagate/library/LibraryDetailPanel.svelte';
import { configStore } from '$lib/state/config.svelte';
import type { useWidgetZoom } from '$lib/state/widget-zoom.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { workspaceContextMenuStore } from '$lib/state/workspace-context-menu.svelte';
import { loadJSON, saveJSON } from '$lib/utils/local-storage';
import { computeBoundingBox, computeFitScroll, computeOrigin } from '$lib/utils/zoom-math';
import { widgetRegistry } from '$lib/widgets';
import PageTabBar from './PageTabBar.svelte';
import WorkspaceWidgetGrid from './WorkspaceWidgetGrid.svelte';

/**
 * Workspace canvas (壁紙 + PageTabBar + 無限 canvas + WorkspaceWidgetGrid + 空状態 hint + 右側 detail panel)。
 *
 * 引用元 guideline:
 *   docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、Grid render を抽出)
 *
 * 親 (WorkspaceLayout) は ResizeObserver / dynamicCols / maxRow を持ち、本 component は受け取った値で
 * canvas size derive と canvas template の render に集中する。
 */
interface Props {
	container?: HTMLDivElement | null;
	containerWidth: number;
	containerHeight: number;
	dynamicCols: number;
	maxRow: number;
	selectedWidgetId: string | null;
	deleteConfirmId: string | null;
	zoom: ReturnType<typeof useWidgetZoom>;
	onEditItem?: (id: string) => void;
	onSelectWorkspace: (id: string) => void;
	onRenameActive: () => void;
	onEditWallpaper: () => void;
	onSelectedWidgetIdChange: (id: string | null) => void;
	onDeleteConfirmIdChange: (id: string | null) => void;
	onCanvasPointerDown?: (e: PointerEvent) => void;
	onCanvasPointerMove?: (e: PointerEvent) => void;
	onCanvasPointerUp?: (e: PointerEvent) => void;
}

let {
	container = $bindable(null),
	containerWidth,
	containerHeight,
	dynamicCols,
	maxRow,
	selectedWidgetId,
	deleteConfirmId,
	zoom,
	onEditItem,
	onSelectWorkspace,
	onRenameActive,
	onEditWallpaper,
	onSelectedWidgetIdChange,
	onDeleteConfirmIdChange,
	onCanvasPointerDown,
	onCanvasPointerMove,
	onCanvasPointerUp,
}: Props = $props();

let infiniteCanvas = $state<HTMLDivElement | null>(null);

// 5/04 user 検収 (post-redo3 #4): pan 位置は **workspace ごと** に永続化 (cross-workspace contamination 防止)。
function panKey(wsId: string | null): string {
	return wsId ? `arcagate.workspace.pan.${wsId}` : 'arcagate.workspace.pan.__default__';
}
let panSaveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 初期 scroll 位置を計算 (Q3 確定: Fit と spec 統一)。
 *   - widget あり: zoom-math.computeFitScroll で BB 重心を viewport visual center に置く
 *   - widget なし: canvas 中央 (grid 全景表示)
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
	return {
		left: Math.min(el.scrollWidth - el.clientWidth, fit.scrollLeft),
		top: Math.min(el.scrollHeight - el.clientHeight, fit.scrollTop),
	};
}

// active workspace 切替で pan を別 workspace の最後位置に復元 (新規は中央起点)。
let lastInitializedWorkspaceId = $state<string | null>(null);
let lastWidgetCount = $state(0);
$effect(() => {
	const wsId = workspaceStore.activeWorkspaceId;
	const widgets = workspaceStore.widgets;
	if (!container || !infiniteCanvas || !wsId) return;
	if (workspaceStore.loading) return;

	// C-11 #3 fix: 0 → 1 への遷移 (空 workspace に最初の widget 追加) で saved pan が
	// canvas 中央 (空時) のまま残り、widget (canvas 0,0) が画面外に飛ぶ問題を解消。
	// widget count が 0→N (N>=1) で変化したら saved pan を破棄し、widget 位置に scroll を合わせる。
	const wsChanged = lastInitializedWorkspaceId !== wsId;
	const becameNonEmpty = lastWidgetCount === 0 && widgets.length > 0;
	if (!wsChanged && !becameNonEmpty) return;

	lastInitializedWorkspaceId = wsId;
	lastWidgetCount = widgets.length;
	queueMicrotask(() => {
		if (!container) return;
		// 0→1 への遷移時は saved pan を無視して widget 位置に scroll (空時の中央 pan は無効化)。
		if (becameNonEmpty) {
			const init = computeInitialScroll(container);
			container.scrollTo({ left: init.left, top: init.top, behavior: 'instant' });
			return;
		}
		const saved = loadJSON<{ left?: number; top?: number }>(panKey(wsId), {});
		if (typeof saved.left === 'number' && typeof saved.top === 'number') {
			container.scrollTo({ left: saved.left, top: saved.top, behavior: 'instant' });
			return;
		}
		const _w = widgets;
		void _w;
		const init = computeInitialScroll(container);
		container.scrollTo({ left: init.left, top: init.top, behavior: 'instant' });
	});
});

function onWorkspaceScroll() {
	if (!container) return;
	if (panSaveTimer) clearTimeout(panSaveTimer);
	const wsId = workspaceStore.activeWorkspaceId;
	panSaveTimer = setTimeout(() => {
		if (!container) return;
		saveJSON(panKey(wsId), {
			left: container.scrollLeft,
			top: container.scrollTop,
		});
	}, 200);
}

// canvas inner box size (grid 込みの flex container 全体): grid と viewport の大きい方。
//   gridContentW = dynamicCols × (widgetW + gap) + flex p-5 padding (40)
//   gridContentH = maxRow × (widgetH + gap) + flex p-5 padding (40)
const FLEX_PADDING = 40; // p-5 = 20px × 2
const GRID_GAP = 16;
let canvasW = $derived(
	Math.max(containerWidth, dynamicCols * (zoom.widgetW + GRID_GAP) + FLEX_PADDING),
);
let canvasH = $derived(
	Math.max(containerHeight, maxRow * (zoom.widgetH + GRID_GAP) + FLEX_PADDING),
);

const widgetComponents = Object.fromEntries(
	Object.entries(widgetRegistry).map(([type, meta]) => [type, meta.Component]),
);

// PH-issue-024: 右クリック → ItemContextMenu popup を表示 (store 経由)。
function handleItemContext(itemId: string, ev?: MouseEvent) {
	workspaceContextMenuStore.openMenu(itemId, ev);
}

// 右側 detail panel (右クリック context menu の「詳細を見る」 から open)。
// 現状 ItemContextMenu には select-detail callback 未配線 (V10 dead code 棚卸 PR-H 対象)、
// state 自体は表示の前提として保持。
let contextItemId = $state<string | null>(null);

function openItemDetail(itemId: string) {
	contextItemId = itemId;
	workspaceContextMenuStore.close();
}
void openItemDetail;
</script>

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
	     検収 #11: 背景色削除 (透明)、border のみ残す。 -->
	<div class="relative z-20 shrink-0 border-b border-[var(--ag-border)] px-5 py-3">
		<PageTabBar
			onSelectWorkspace={onSelectWorkspace}
			onRenameActive={onRenameActive}
			onEditWallpaper={onEditWallpaper}
		/>
	</div>

	<!-- Canvas: widget grid のみが scroll/pan 可能。
	     PH-issue-034 / 検収項目 #9: Obsidian Canvas のように上下左右無限パン。
	     dotted grid 背景は infinite-canvas に置くので scroll に追従 (Obsidian と一致)。 -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="canvas-edit-mode relative z-10 min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]"
		style="--widget-w: {zoom.widgetW}px; --widget-h: {zoom.widgetH}px; background: transparent;"
		data-zoom={configStore.widgetZoom}
		bind:this={container}
		onpointerdown={onCanvasPointerDown}
		onpointermove={onCanvasPointerMove}
		onpointerup={onCanvasPointerUp}
		onscroll={onWorkspaceScroll}
	>
		<!-- 5/04 user 検収 (post-redo3 #2): canvas size = max(viewport, grid)、padding 0。 -->
		<div
			class="relative"
			style="width: {canvasW}px; height: {canvasH}px; background-image: radial-gradient(circle, rgba(128,128,128,0.22) 1.5px, transparent 1.5px); background-size: 24px 24px;"
			bind:this={infiniteCanvas}
		>
			<div class="flex gap-4 p-5">
				<div class="relative min-w-0 flex-1">
					<!-- 検収 #6: WorkspaceWidgetGrid は **常時** 描画する。
					     widgets.length === 0 時の grid unmount で pointerup → addWidget 失敗を起こすため。 -->
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
						onSelectedWidgetIdChange={onSelectedWidgetIdChange}
						onDeleteConfirmIdChange={onDeleteConfirmIdChange}
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
