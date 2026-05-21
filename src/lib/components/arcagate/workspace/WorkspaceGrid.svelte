<script lang="ts">
import { CheckCheck, LayoutGrid, SquareDashed } from '@lucide/svelte';
import { convertFileSrc } from '@tauri-apps/api/core';
import LibraryDetailPanel from '$lib/components/arcagate/library/LibraryDetailPanel.svelte';
import ContextMenu from '$lib/components/common/ContextMenu.svelte';
import { t } from '$lib/i18n.svelte';
import { configStore } from '$lib/state/config.svelte';
import type { useWidgetZoom } from '$lib/state/widget-zoom.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { workspaceContextMenuStore } from '$lib/state/workspace-context-menu.svelte';
import { workspaceSelection } from '$lib/state/workspace-selection.svelte';
import { loadJSON, saveJSON } from '$lib/utils/local-storage';
import {
	bufferOffsetPx,
	clampZoom,
	computeBoundingBox,
	computeFitScroll,
	computeOrigin,
	effectiveBottomReserve,
} from '$lib/utils/zoom-math';
import { widgetRegistry } from '$lib/widgets';
import PageTabBar from './PageTabBar.svelte';
import WorkspaceHintBar from './WorkspaceHintBar.svelte';
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
	deleteConfirmId: string | null;
	zoom: ReturnType<typeof useWidgetZoom>;
	onEditItem?: (id: string) => void;
	onSelectWorkspace: (id: string) => void;
	onRenameActive: () => void;
	onEditWallpaper: () => void;
	onDeleteConfirmIdChange: (id: string | null) => void;
	onCanvasPointerDown?: (e: PointerEvent) => void;
	onCanvasPointerMove?: (e: PointerEvent) => void;
	onCanvasPointerUp?: (e: PointerEvent) => void;
	/** 現在 viewport 中央の grid cell を返す (新規 widget の位置情報なし配置 seed 用)。 */
	getViewportCenterCell: () => { x: number; y: number } | null;
	/** audit batch deferred (2026-05-13) #12 part 2: Box (rubber-band) selection overlay rect。 */
	boxSelectState?: {
		readonly active: boolean;
		readonly rect: { left: number; top: number; width: number; height: number };
	};
}

let {
	container = $bindable(null),
	containerWidth,
	containerHeight,
	dynamicCols,
	maxRow,
	deleteConfirmId,
	zoom,
	onEditItem,
	onSelectWorkspace,
	onRenameActive,
	onEditWallpaper,
	onDeleteConfirmIdChange,
	onCanvasPointerDown,
	onCanvasPointerMove,
	onCanvasPointerUp,
	getViewportCenterCell,
	boxSelectState,
}: Props = $props();

let infiniteCanvas = $state<HTMLDivElement | null>(null);

// 5/04 user 検収 (post-redo3 #4): pan 位置は **workspace ごと** に永続化 (cross-workspace contamination 防止)。
function panKey(wsId: string | null): string {
	return wsId ? `arcagate.workspace.pan.${wsId}` : 'arcagate.workspace.pan.__default__';
}
let panSaveTimer: ReturnType<typeof setTimeout> | null = null;

// #6: zoom も pan と同じく **workspace ごと** に永続化する。
// page (workspace tab) 切替時に復元、zoom 変更時 (wheel / fit / reset) に保存。
function zoomKey(wsId: string | null): string {
	return wsId ? `arcagate.workspace.zoom.${wsId}` : 'arcagate.workspace.zoom.__default__';
}
let zoomSaveTimer: ReturnType<typeof setTimeout> | null = null;

// zoom 変更を debounce して現在 workspace のキーに保存 (fit / reset / wheel すべて追従)。
$effect(() => {
	const z = configStore.widgetZoom;
	const wsId = workspaceStore.activeWorkspaceId;
	if (!wsId) return;
	if (zoomSaveTimer) clearTimeout(zoomSaveTimer);
	zoomSaveTimer = setTimeout(() => {
		saveJSON(zoomKey(wsId), { zoom: z });
	}, 200);
});

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
	const fit = computeFitScroll(
		origin,
		configStore.widgetZoom,
		{
			clientWidth: el.clientWidth,
			clientHeight: el.clientHeight,
		},
		effectiveBottomReserve(configStore.hintBarVisible),
	);
	return {
		left: Math.min(el.scrollWidth - el.clientWidth, fit.scrollLeft),
		top: Math.min(el.scrollHeight - el.clientHeight, fit.scrollTop),
	};
}

// active workspace 切替で pan を別 workspace の最後位置に復元 (新規は中央起点)。
let lastInitializedWorkspaceId = $state<string | null>(null);
$effect(() => {
	const wsId = workspaceStore.activeWorkspaceId;
	const widgets = workspaceStore.widgets;
	if (!container || !infiniteCanvas || !wsId) return;
	if (workspaceStore.loading) return;
	if (lastInitializedWorkspaceId === wsId) return;
	lastInitializedWorkspaceId = wsId;
	// #6: pan より先に zoom を復元 (pan の computeInitialScroll が zoom に依存するため)。
	const savedZoom = loadJSON<{ zoom?: number }>(zoomKey(wsId), {});
	if (typeof savedZoom.zoom === 'number') {
		configStore.setWidgetZoom(
			clampZoom(savedZoom.zoom, configStore.widgetMinZoom, configStore.widgetMaxZoom),
		);
	}
	queueMicrotask(() => {
		if (!container) return;
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
//   gridContentW = bufferPx.x + dynamicCols × (widgetW + gap) + flex p-5 padding (40)
//   gridContentH = bufferPx.y + maxRow × (widgetH + gap) + flex p-5 padding (40)
//
// 2026-05-07 user 検収「左/上の壁が戻った」 fix: canvas に buffer 領域 (BUFFER_COLS_LEFT × BUFFER_ROWS_TOP)
// を持たせ、grid origin (0,0) を canvas 内側へ offset する。これで widget が grid 端に置かれても
// canvas 上は buffer 分だけ右下にあり、user は更に上/左へ pan できる empty 領域を持つ (Obsidian Canvas 風)。
const FLEX_PADDING = 40; // p-5 = 20px × 2
const GRID_GAP = 16;
let bufferPx = $derived(bufferOffsetPx(configStore.widgetZoom));
// canvas 末尾の trailing 余白。
// 2026-05-19 (C 案): leading buffer (bufferPx) を widget 約 50 個分まで拡大したため、
// trailing 側にも **同等の bufferPx** を加算する。 これで grid content が canvas の中央付近に
// 来て、 空 workspace でも初期 scroll (canvas 中央) で grid が viewport に入る。 旧実装の
// trailing = containerWidth のみだと grid が左寄りになり「開いたら空白しか見えない」 状態。
let canvasW = $derived(
	Math.max(
		containerWidth,
		bufferPx.x +
			dynamicCols * (zoom.widgetW + GRID_GAP) +
			FLEX_PADDING +
			bufferPx.x +
			containerWidth,
	),
);
// K-6 fix (2026-05-15): canvasH に bottom reserve を加算 → 最下段 widget が floating bottom
// toolbar の裏に隠れず scroll で逃せる。 2026-05-19 (C 案): trailing にも bufferPx.y を加算。
let canvasH = $derived(
	Math.max(
		containerHeight,
		bufferPx.y +
			maxRow * (zoom.widgetH + GRID_GAP) +
			FLEX_PADDING +
			effectiveBottomReserve(configStore.hintBarVisible) +
			bufferPx.y +
			containerHeight,
	),
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

// 2026-05-17 user 検収: canvas 空白部の右クリック専用メニュー (全選択 / 選択解除)。
let canvasMenu = $state<{ open: boolean; x: number; y: number }>({ open: false, x: 0, y: 0 });

function handleCanvasContextMenu(e: MouseEvent): void {
	// widget 上の右クリックは各 widget の context menu が preventDefault 済 →
	// defaultPrevented で判別し、 空白部の時だけ canvas menu を開く。
	if (e.defaultPrevented) return;
	e.preventDefault();
	canvasMenu = { open: true, x: e.clientX, y: e.clientY };
}

function closeCanvasMenu(): void {
	canvasMenu = { ...canvasMenu, open: false };
}

function selectAllWidgets(): void {
	workspaceSelection.setMany(workspaceStore.widgets.map((w) => w.id));
	closeCanvasMenu();
}

function deselectAllWidgets(): void {
	workspaceSelection.clear();
	closeCanvasMenu();
}
</script>

<!-- 4/30 user 検収: wallpaper 未設定時の fallback 背景を column 自体に置く。
     canvas-edit-mode は透明、wallpaper layer (z-0) があれば最前で見え、無ければこの背景が見える。
     #512 regression fix: 強い縦グラデを廃し theme 制御の単色 token (--ag-workspace-bg) に。 -->
<div
	class="relative flex min-w-0 flex-1 flex-col overflow-hidden"
	style="background: var(--ag-workspace-bg);"
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

	<!-- 上部 PageTabBar (workspace 切替 + 壁紙設定 button)。
	     設計方針 (2026-05-22 user 指示): 全幅 bar / 区切り線は持たない。 PageTabBar 自身が
	     frosted glass pill (ag-glass) で、 canvas 上に浮かぶ単一 pill として中央に配置する。
	     wallpaper は pill 越しにうっすら透ける。

	     2026-05-22 fix (#536 後続): 旧実装は wrapper が **flex item** で canvas column の sibling
	     として高さを占有 → canvas が wrapper の下に押し込まれ、 pill 外側の wrapper 領域 (透明)
	     も widget レイヤー (z-10) より前面 (z-20) で canvas 上端の widget が「切れて見える」
	     user 報告。 wrapper を canvas に対する **absolute overlay** (pointer-events-none) に
	     変更し、 canvas は full-height (wrapper の下に押し込まれない) + pill 部分のみ canvas
	     上端を visually 占有 + pill 外側の透明領域は pointer-events 透過で widget が完全に
	     生きる構造に統一。 これで TOP_RESERVE が canvas 内で意味を持ち、 fit-to-content の
	     visual center 計算が user 期待 (上タブバー下端〜下ツールバー上端の中央) と一致する。 -->
	<div
		class="pointer-events-none absolute left-0 right-0 top-0 z-20 flex justify-center px-5 py-3"
	>
		<div class="pointer-events-auto">
			<PageTabBar
				onSelectWorkspace={onSelectWorkspace}
				onRenameActive={onRenameActive}
				onEditWallpaper={onEditWallpaper}
			/>
		</div>
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
		oncontextmenu={handleCanvasContextMenu}
	>
		<!-- 5/04 user 検収 (post-redo3 #2): canvas size = max(viewport, grid)、padding 0。
		     2026-05-07 fix: canvas に buffer 領域 (BUFFER_COLS_LEFT × BUFFER_ROWS_TOP) を持たせ、
		     widget grid origin (0,0) を canvas 内側へ offset することで「左/上の壁」を解消。 -->
		<div
			class="relative"
			style="width: {canvasW}px; height: {canvasH}px; background-image: radial-gradient(circle, var(--ag-canvas-dot) 1.5px, transparent 1.5px); background-size: 24px 24px;"
			bind:this={infiniteCanvas}
		>
			<!-- audit batch deferred (2026-05-13) #12 part 2: Box (rubber-band) selection overlay。
			     accent 色の半透明 rect、 pointer-events-none で click 透過。 -->
			{#if boxSelectState?.active}
				{@const bs = boxSelectState.rect}
				<div
					class="pointer-events-none absolute z-30 rounded-sm border border-[var(--ag-accent)] bg-[var(--ag-accent-bg)]/30"
					style="left: {bs.left}px; top: {bs.top}px; width: {bs.width}px; height: {bs.height}px;"
					aria-hidden="true"
				></div>
			{/if}
			<div
				class="flex gap-4 p-5"
				style="padding-left: {bufferPx.x + 20}px; padding-top: {bufferPx.y + 20}px;"
			>
				<div class="relative min-w-0 flex-1">
					<!-- 検収 #6: WorkspaceWidgetGrid は **常時** 描画する。
					     widgets.length === 0 時の grid unmount で pointerup → addWidget 失敗を起こすため。 -->
					<WorkspaceWidgetGrid
						{dynamicCols}
						{maxRow}
						widgetW={zoom.widgetW}
						widgetH={zoom.widgetH}
						{widgetComponents}
						{deleteConfirmId}
						{getViewportCenterCell}
						editMode={true}
						onItemContext={handleItemContext}
						onDeleteConfirmIdChange={onDeleteConfirmIdChange}
					/>
					{#if workspaceStore.widgets.length === 0}
						<div
							class="pointer-events-none absolute inset-x-0 top-12 flex flex-col items-center justify-center gap-2 text-center"
						>
							<LayoutGrid class="h-12 w-12 text-[var(--ag-text-faint)]" />
							<p class="text-sm font-medium text-[var(--ag-text-secondary)]">
								{t('workspace.empty_add_title')}
							</p>
							<p class="max-w-md text-xs text-[var(--ag-text-muted)]">
								{t('workspace.empty_add_desc')}
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

	<!-- 2026-05-17 user 検収: 下部ショートカットヒントバー。 canvas column 内に置くことで
	     widget サイドバーに被らない (旧: WorkspaceLayout 直下で sidebar 上まで全幅に伸びていた)。
	     Settings で非表示にでき、 fit-to-content の reserve も effectiveBottomReserve() で連動。 -->
	{#if configStore.hintBarVisible}
		<WorkspaceHintBar selectedWidgetId={workspaceSelection.singleId} />
	{/if}
</div>

<ContextMenu open={canvasMenu.open} x={canvasMenu.x} y={canvasMenu.y} onClose={closeCanvasMenu}>
	<button
		type="button"
		role="menuitem"
		class="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[var(--ag-text-primary)] focus-visible:bg-[var(--ag-surface-3)] focus-visible:outline-none hover:bg-[var(--ag-surface-3)] disabled:opacity-40"
		data-testid="canvas-context-select-all"
		disabled={workspaceStore.widgets.length === 0}
		onclick={selectAllWidgets}
	>
		<CheckCheck class="h-3.5 w-3.5" />
		{t('context_menu.select_all')}
	</button>
	<button
		type="button"
		role="menuitem"
		class="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[var(--ag-text-primary)] focus-visible:bg-[var(--ag-surface-3)] focus-visible:outline-none hover:bg-[var(--ag-surface-3)] disabled:opacity-40"
		data-testid="canvas-context-deselect"
		disabled={workspaceSelection.size === 0}
		onclick={deselectAllWidgets}
	>
		<SquareDashed class="h-3.5 w-3.5" />
		{t('context_menu.deselect')}
	</button>
</ContextMenu>
