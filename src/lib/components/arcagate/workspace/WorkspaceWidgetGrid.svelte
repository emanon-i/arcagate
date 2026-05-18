<script lang="ts">
import type { Component } from 'svelte';
import { pointerDrag } from '$lib/state/pointer-drag.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { workspaceSelection } from '$lib/state/workspace-selection.svelte';
import { WIDGET_LABELS } from '$lib/types/workspace';
import {
	computeMoveDragPreviews,
	type DragPreviewBox,
	wouldOverlapAt,
} from '$lib/utils/widget-grid';
import type { RenderExtent } from '$lib/utils/zoom-math';
import { widgetRegistry } from '$lib/widgets';
import WidgetHandles from './WidgetHandles.svelte';

interface Props {
	/** 無限 canvas の render origin + grid 全体 cell 範囲 (zoom-math.computeRenderExtent)。 */
	extent: RenderExtent;
	widgetW: number;
	widgetH: number;
	widgetComponents: Record<string, Component>;
	deleteConfirmId: string | null;
	editMode?: boolean;
	/**
	 * PH-issue-024: 第 2 引数 ev で context menu の表示位置を取る (clientX/Y)。
	 * 旧 callback 互換のため引数 1 個でも呼べるが、新規実装は ev を受け取って x/y で popup 位置を決める。
	 */
	onItemContext: (itemId: string, ev?: MouseEvent) => void;
	onDeleteConfirmIdChange: (id: string | null) => void;
}

let {
	extent,
	widgetW,
	widgetH,
	widgetComponents,
	editMode = true,
	onItemContext,
	onDeleteConfirmIdChange,
}: Props = $props();

// H-2 Tier B: selection は workspaceSelection store (Set<string>)
function handleWidgetClick(e: MouseEvent, id: string): void {
	e.stopPropagation();
	if (e.shiftKey) {
		workspaceSelection.toggle(id);
	} else {
		workspaceSelection.setSingle(id);
	}
}

let dropZoneEl = $state<HTMLDivElement | null>(null);

function calcDropCell(clientX: number, clientY: number): { x: number; y: number } {
	const ref = dropZoneEl;
	if (!ref) return { x: extent.originX, y: extent.originY };
	const rect = ref.getBoundingClientRect();
	const relX = clientX - rect.left;
	const relY = clientY - rect.top;
	const gap = 16;
	const cellW = widgetW + gap;
	const cellH = widgetH + gap;
	// 2026-05-19 無限 canvas: dropZone 左上 = grid cell (originX, originY)。
	// render-relative cell index に render origin を足して絶対 cell 座標へ変換 (負値可、 clamp なし)。
	return {
		x: extent.originX + Math.floor(relX / cellW),
		y: extent.originY + Math.floor(relY / cellH),
	};
}

function isOverDropZone(clientX: number, clientY: number): boolean {
	const ref = dropZoneEl;
	if (!ref) return false;
	const rect = ref.getBoundingClientRect();
	return (
		clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
	);
}

// ドキュメントレベルの pointer イベントでドラッグ追跡
$effect(() => {
	if (!pointerDrag.active) return;

	// audit 2026-05-13 F8: getBoundingClientRect() を pointermove 内 3 回呼出 (60 FPS で 180 query/s)
	// を rAF (= 表示 refresh と同期) に throttle。 60 → 60 Hz は変わらないが、 各 frame で
	// 最新 client 座標だけ処理 (中間値捨て)、 layout thrashing 回避。
	let rafId: number | null = null;
	let pendingX = 0;
	let pendingY = 0;

	function processMove() {
		rafId = null;
		pointerDrag.move(pendingX, pendingY);
		if (isOverDropZone(pendingX, pendingY)) {
			pointerDrag.setDropCell(calcDropCell(pendingX, pendingY));
		} else {
			pointerDrag.setDropCell(null);
		}
	}

	function onMove(e: PointerEvent) {
		pendingX = e.clientX;
		pendingY = e.clientY;
		if (rafId === null) {
			rafId = requestAnimationFrame(processMove);
		}
	}

	/**
	 * 検収 #5: dropZone の viewport-visible 中央セルを返す。click 追加時に widget が画面外に
	 * 配置される問題への対策。dropZone (= 全 grid) の中で、scroll コンテナの可視矩形と交差する
	 * 領域の中央セルを計算する。
	 */
	function viewportCenterCell(): { x: number; y: number } | null {
		const ref = dropZoneEl;
		if (!ref) return null;
		const dropRect = ref.getBoundingClientRect();
		// 可視矩形 = window viewport (Workspace canvas は overflow-auto なので getBoundingClientRect は
		// scroll 後の絶対座標を返す)。dropZone の可視範囲は dropRect ∩ window viewport。
		const vpLeft = Math.max(0, dropRect.left);
		const vpTop = Math.max(0, dropRect.top);
		const vpRight = Math.min(window.innerWidth, dropRect.right);
		const vpBottom = Math.min(window.innerHeight, dropRect.bottom);
		if (vpRight <= vpLeft || vpBottom <= vpTop) return null;
		const cx = (vpLeft + vpRight) / 2;
		const cy = (vpTop + vpBottom) / 2;
		return calcDropCell(cx, cy);
	}

	function onUp(e: PointerEvent) {
		// audit 2026-05-13 Codex Round 3 fix: pending rAF を flush してから dropCell 読込。
		// 旧: rAF が pending のまま onUp 発火 → stale dropCell で誤位置 commit (very fast release)。
		// 新: pending あれば cancel + 同期 process で最新 client 座標を反映。
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
			pendingX = e.clientX;
			pendingY = e.clientY;
			processMove();
		}
		const cell = pointerDrag.dropCell;
		const src = pointerDrag.active;
		pointerDrag.end();

		if (!src) return;
		if (src.kind === 'add') {
			// 2026-05-19 無限 canvas: drop cell があればそこへ、 無ければ (canvas 外で release)
			// viewport 中央 cell を seed に配置する。 grid 端の壁が無いため bounds 引数は不要。
			if (cell) {
				void workspaceStore.addWidgetAt(src.widgetType, cell.x, cell.y);
			} else {
				const near = viewportCenterCell() ?? undefined;
				void workspaceStore.addWidget(src.widgetType, near);
			}
		} else if (src.kind === 'move') {
			if (cell) {
				// H-2 Tier B: 複数 widget が selected で primary がその中なら全体 delta 移動
				if (workspaceSelection.size > 1 && workspaceSelection.has(src.widgetId)) {
					const primary = workspaceStore.widgets.find((w) => w.id === src.widgetId);
					if (primary) {
						const dx = cell.x - primary.position_x;
						const dy = cell.y - primary.position_y;
						const moves = workspaceSelection
							.asArray()
							.map((id) => {
								const w = workspaceStore.widgets.find((x) => x.id === id);
								return w ? { id, toX: w.position_x + dx, toY: w.position_y + dy } : null;
							})
							.filter((m): m is { id: string; toX: number; toY: number } => m !== null);
						void workspaceStore.moveMany(moves);
					}
				} else {
					void workspaceStore.moveWidget(src.widgetId, cell.x, cell.y);
				}
			}
		}
	}

	document.addEventListener('pointermove', onMove);
	document.addEventListener('pointerup', onUp);
	document.addEventListener('pointercancel', onUp);

	return () => {
		// audit F8: rAF in-flight cleanup (drag 中に effect 解除されても dangling frame 残らない)。
		if (rafId !== null) cancelAnimationFrame(rafId);
		document.removeEventListener('pointermove', onMove);
		document.removeEventListener('pointerup', onUp);
		document.removeEventListener('pointercancel', onUp);
	};
});

// H-2 Tier B (2026-05-09 user 検収): Delete / Backspace で全選択 widget を削除 (history 1 batch)。
// Esc で全選択解除。単選択時 (size=1) は従来通り deleteConfirmDialog 経路。
function handleKeydown(e: KeyboardEvent) {
	if (!editMode) return;
	const target = e.target as HTMLElement | null;
	const isEditable =
		target &&
		(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
	if (isEditable) return;
	if (e.key === 'Escape' && workspaceSelection.size > 0) {
		e.preventDefault();
		workspaceSelection.clear();
		return;
	}
	if (e.key === 'Delete' || e.key === 'Backspace') {
		if (workspaceSelection.size === 0) return;
		e.preventDefault();
		if (workspaceSelection.size === 1) {
			// 単選択は既存 ConfirmDialog 経路 (誤操作防止)
			onDeleteConfirmIdChange(workspaceSelection.singleId);
		} else {
			// 複数選択は明示的 multi delete として即実行 (history で undo 可能)
			void workspaceStore.removeMany(workspaceSelection.asArray());
			workspaceSelection.clear();
		}
	}
}

$effect(() => {
	if (!editMode) return;
	document.addEventListener('keydown', handleKeydown);
	return () => document.removeEventListener('keydown', handleKeydown);
});

/**
 * #12: drag 中の preview box 群。
 * - add: 1 box (default size)。
 * - move (単): primary 1 box。
 * - move (複数選択かつ primary が選択内): 選択 widget 全部を同 delta で preview box 化
 *   → 「複数選択中の 1 つを drag すると他選択 widget も同 delta で追従」を視覚化。
 * 2026-05-19 無限 canvas: grid 端の壁を撤廃したため blocked 判定は非移動 widget との
 * overlap のみ。1 box でも違反なら moveMany は atomic reject するため、dragBlocked は
 * OR で全 box を赤表示する。
 */
let dragPreviews = $derived.by<DragPreviewBox[]>(() => {
	const active = pointerDrag.active;
	const cell = pointerDrag.dropCell;
	if (!active || !cell) return [];
	if (active.kind === 'add') {
		const sz = widgetRegistry[active.widgetType]?.defaultSize ??
			widgetRegistry[active.widgetType]?.minViableSize ?? { w: 2, h: 2 };
		const others = workspaceStore.widgets.map((w) => ({
			x: w.position_x,
			y: w.position_y,
			w: w.width,
			h: w.height,
		}));
		const blocked = wouldOverlapAt(cell.x, cell.y, sz.w, sz.h, others);
		return [{ x: cell.x, y: cell.y, w: sz.w, h: sz.h, blocked }];
	}
	const primary = workspaceStore.widgets.find((w) => w.id === active.widgetId);
	if (!primary) return [];
	const dx = cell.x - primary.position_x;
	const dy = cell.y - primary.position_y;
	// 複数選択 drag (primary が選択内) なら選択全部、それ以外は primary のみ移動。
	const isMulti = workspaceSelection.size > 1 && workspaceSelection.has(active.widgetId);
	const movingIds = new Set(isMulti ? workspaceSelection.asArray() : [active.widgetId]);
	return computeMoveDragPreviews(workspaceStore.widgets, movingIds, dx, dy);
});

let dragBlocked = $derived(dragPreviews.some((p) => p.blocked));
</script>

<!-- L-3: Grid with overlay -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="relative"
	data-testid="workspace-drop-zone"
	bind:this={dropZoneEl}
>
	<!-- Grid lines overlay (in flow — defines drop zone height)。
	     2026-05-19 無限 canvas: grid 範囲は render extent (BB + 全方位 margin) で決まる。 -->
	<div
		class="pointer-events-none"
		style="display: grid; grid-template-columns: repeat({extent.cols}, var(--widget-w)); grid-auto-rows: var(--widget-h); gap: 16px;"
	>
		{#each Array(extent.cols * extent.rows) as _, i}
			<div class="border border-dashed border-[var(--ag-border)]/30"></div>
		{/each}
	</div>

	<!-- Widget grid (absolute overlay on top of grid lines) -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="absolute inset-0 z-10"
		style="display: grid; grid-template-columns: repeat({extent.cols}, var(--widget-w)); grid-auto-rows: var(--widget-h); gap: 16px;"
		onclick={() => { workspaceSelection.clear(); }}
	>
		{#each workspaceStore.widgets as widget (widget.id)}
			{@const WidgetComp = widgetComponents[widget.widget_type as keyof typeof widgetComponents]}
			{@const isMoving = pointerDrag.active?.kind === 'move' && pointerDrag.active.widgetId === widget.id}
			{@const isSelected = editMode && workspaceSelection.has(widget.id)}
			{#if WidgetComp}
				<!-- PH-issue-001: WidgetHandles を選択時のみマウント。
				     非選択 widget は通常表示のみ、handle / ring は出ない (P11 装飾は対象を邪魔しない)。
				     H-2 Tier B: 複数 widget 選択時は全部に ring が描画される。 -->
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<!-- audit batch deferred (2026-05-13) #12 part 2: data-widget-id 付与で Box (rubber-band)
				     selection 時に container 内 widget element の bounding box を取得できる。 -->
				<div
					class="relative transition-opacity focus-visible:outline-none"
					class:opacity-60={isMoving}
					role="group"
					aria-label={WIDGET_LABELS[widget.widget_type] ?? widget.widget_type}
					tabindex={editMode ? 0 : -1}
					data-widget-id={widget.id}
					style="grid-column: {widget.position_x - extent.originX + 1} / span {widget.width}; grid-row: {widget.position_y - extent.originY + 1} / span {widget.height};"
					onclick={(e) => handleWidgetClick(e, widget.id)}
				>
					<WidgetComp {widget} {onItemContext} />
					{#if editMode}
						<WidgetHandles
							widgetId={widget.id}
							{isSelected}
							{widgetW}
							{widgetH}
							{onDeleteConfirmIdChange}
						/>
					{/if}
				</div>
			{/if}
		{/each}

		<!-- #12: Drop preview。複数選択 drag では選択 widget 全部を同 delta で preview 表示する。
		     overlap / 越境を accent (free) / destructive (blocked) で色分け。1 box でも違反すれば
		     moveMany が atomic reject するため、dragBlocked (OR) で全 box を赤表示する。 -->
		{#each dragPreviews as p, i (i)}
			{@const colorVar = dragBlocked ? 'var(--ag-error-text)' : 'var(--ag-accent)'}
			<div
				class="pointer-events-none rounded-lg border-2 border-dashed transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none"
				style="
					grid-column: {p.x - extent.originX + 1} / span {p.w};
					grid-row: {p.y - extent.originY + 1} / span {p.h};
					border-color: {colorVar};
					background: color-mix(in srgb, {colorVar} 10%, transparent);
					box-shadow: 0 0 0 2px {colorVar};
				"
			></div>
		{/each}
	</div>
</div>
