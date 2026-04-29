<script lang="ts">
import { GripHorizontal, X } from '@lucide/svelte';
import { pointerDrag } from '$lib/state/pointer-drag.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import {
	clampResizeForOverlap,
	computeResize,
	RESIZE_CURSORS,
	RESIZE_LABELS,
	type ResizeDir,
} from '$lib/utils/resize-delta';

/**
 * PH-issue-001: Widget 編集モード時の操作 UI を 1 コンポーネントに集約。
 *
 * 引用元 guideline:
 * - `docs/desktop_ui_ux_agent_rules.md` P11 (装飾は対象を邪魔しない) / P12 (整合性) / P3 (主要操作)
 * - `docs/l1_requirements/ux_standards.md` §6-1 (Widget 仕様) / §13 (Workspace Canvas 編集 UX)
 * - `docs/l1_requirements/ux_design_vision.md` §2-3 (Responsive 100ms / Consistent easing)
 * - `docs/l0_ideas/arcagate-visual-language.md` (「よく磨かれた工具」、過度に派手 NG)
 *
 * 構造 (選択時のみ表示):
 * - selection ring: ring-2 ring-[var(--ag-accent)] (§6-1 規格)
 * - 上端 drag bar: floating chip (-top-3、20px wide、cursor-grab、ghost)
 * - 右上 × button: shadcn ghost-icon、hover で bg-destructive/10 + text-destructive
 * - 8 方向 resize handles: edge ストリップ (n/s/e/w) + corner chip (nw/ne/sw/se)
 *
 * 非選択 widget: 何も表示しない (selection ring も含む)。
 */

interface Props {
	widgetId: string;
	isSelected: boolean;
	dynamicCols: number;
	widgetW: number;
	widgetH: number;
	onSelectedWidgetIdChange: (id: string | null) => void;
	onDeleteConfirmIdChange: (id: string | null) => void;
}

let {
	widgetId,
	isSelected,
	dynamicCols,
	widgetW,
	widgetH,
	onSelectedWidgetIdChange,
	onDeleteConfirmIdChange,
}: Props = $props();

const MAX_SPAN = 4;

const isMoving = $derived(
	pointerDrag.active?.kind === 'move' && pointerDrag.active.widgetId === widgetId,
);

function handleResizeStart(e: PointerEvent, dir: ResizeDir) {
	e.preventDefault();
	e.stopPropagation();
	const handle = e.currentTarget as HTMLElement;
	handle.setPointerCapture(e.pointerId);

	const startX = e.clientX;
	const startY = e.clientY;
	const widget = workspaceStore.widgets.find((w) => w.id === widgetId);
	if (!widget) return;
	const start = {
		x: widget.position_x,
		y: widget.position_y,
		w: widget.width,
		h: widget.height,
	};

	const cellW = widgetW + 16;
	const cellH = widgetH + 16;

	function onMove(ev: PointerEvent) {
		const dx = ev.clientX - startX;
		const dy = ev.clientY - startY;
		const stepDx = Math.round(dx / cellW);
		const stepDy = Math.round(dy / cellH);
		const proposed = computeResize(start, stepDx, stepDy, dir, {
			maxSpan: MAX_SPAN,
			maxCols: dynamicCols,
		});
		const others = workspaceStore.widgets
			.filter((ww) => ww.id !== widgetId)
			.map((ww) => ({ x: ww.position_x, y: ww.position_y, w: ww.width, h: ww.height }));
		const next = clampResizeForOverlap(start, proposed, others);
		workspaceStore.optimisticMoveAndResize(widgetId, next.x, next.y, next.w, next.h);
	}

	function onUp(ev: PointerEvent) {
		handle.releasePointerCapture(ev.pointerId);
		const w = workspaceStore.widgets.find((ww) => ww.id === widgetId);
		if (w) {
			// PH-issue-002: resize 開始時の start snapshot を before、現在を after として
			// history 経由で永続化する。
			void workspaceStore.commitMoveAndResize(
				widgetId,
				start,
				{ x: w.position_x, y: w.position_y, w: w.width, h: w.height },
				'resize',
			);
		}
		handle.removeEventListener('pointermove', onMove);
		handle.removeEventListener('pointerup', onUp);
	}

	handle.addEventListener('pointermove', onMove);
	handle.addEventListener('pointerup', onUp);
}

function handleMoveStart(e: PointerEvent) {
	e.preventDefault();
	e.stopPropagation();
	(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	onSelectedWidgetIdChange(widgetId);
	pointerDrag.start({ kind: 'move', widgetId }, e.clientX, e.clientY);
}

function handleDelete(e: MouseEvent | KeyboardEvent) {
	e.stopPropagation();
	onDeleteConfirmIdChange(widgetId);
}
</script>

{#if isSelected}
	<!-- Selection ring: §6-1 規格通り、ring-2 ring-[var(--ag-accent)] -->
	<div
		class="pointer-events-none absolute inset-0 rounded-[var(--ag-radius-widget)] ring-2 ring-[var(--ag-accent)]"
		aria-hidden="true"
	></div>

	<!-- 上端 drag bar (Notion 風 floating chip、ghost)。
	     PH-widget-polish: hover で chip border 強調 + grip icon 色明確化 (P1 操作可視化)、
	     title で「ドラッグで移動」を tooltip 表示。 -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="group/drag absolute -top-3 left-1/2 z-20 flex h-6 w-12 -translate-x-1/2 items-center justify-center rounded-full border border-[var(--ag-border)] bg-[var(--ag-surface-1)] shadow-[var(--ag-shadow-sm,0_2px_4px_rgba(0,0,0,0.1))] transition-[background-color,border-color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:border-[var(--ag-border-hover)] hover:bg-[var(--ag-surface-2)]"
		class:cursor-grab={!isMoving}
		class:cursor-grabbing={isMoving}
		role="button"
		tabindex="-1"
		aria-label="ウィジェットを移動"
		title="ドラッグで移動"
		onpointerdown={handleMoveStart}
	>
		<GripHorizontal
			class="h-3 w-3 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none group-hover/drag:text-[var(--ag-text-secondary)]"
		/>
	</div>

	<!-- 右上 × button (shadcn ghost-icon、destructive hover)。
	     PH-widget-polish: title で「削除 (Delete)」を keyboard shortcut hint、cursor-pointer 明示。 -->
	<button
		type="button"
		class="absolute -right-3 -top-3 z-20 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-[var(--ag-border)] bg-[var(--ag-surface-1)] text-[var(--ag-text-secondary)] shadow-[var(--ag-shadow-sm,0_2px_4px_rgba(0,0,0,0.1))] transition-[background-color,color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-destructive hover:text-white active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
		aria-label="ウィジェットを削除"
		title="削除 (Delete)"
		onclick={handleDelete}
	>
		<X class="h-4 w-4" />
	</button>

	<!-- 8 方向 Resize handles (§13 規格、batch-71 進捗を本 plan で完成) -->
	<!-- 上辺 (n) -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="absolute -top-px left-1/2 z-15 h-1.5 w-12 -translate-x-1/2 rounded-full bg-[var(--ag-accent)]/0 transition-colors duration-[var(--ag-duration-fast)] hover:bg-[var(--ag-accent)]/40"
		style="cursor: {RESIZE_CURSORS.n}"
		aria-label={RESIZE_LABELS.n}
		onpointerdown={(e) => handleResizeStart(e, 'n')}
	></div>
	<!-- 下辺 (s) -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="absolute -bottom-px left-1/2 z-15 h-1.5 w-12 -translate-x-1/2 rounded-full bg-[var(--ag-accent)]/0 transition-colors duration-[var(--ag-duration-fast)] hover:bg-[var(--ag-accent)]/40"
		style="cursor: {RESIZE_CURSORS.s}"
		aria-label={RESIZE_LABELS.s}
		onpointerdown={(e) => handleResizeStart(e, 's')}
	></div>
	<!-- 右辺 (e) -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="absolute -right-px top-1/2 z-15 h-12 w-1.5 -translate-y-1/2 rounded-full bg-[var(--ag-accent)]/0 transition-colors duration-[var(--ag-duration-fast)] hover:bg-[var(--ag-accent)]/40"
		style="cursor: {RESIZE_CURSORS.e}"
		aria-label={RESIZE_LABELS.e}
		onpointerdown={(e) => handleResizeStart(e, 'e')}
	></div>
	<!-- 左辺 (w) -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="absolute -left-px top-1/2 z-15 h-12 w-1.5 -translate-y-1/2 rounded-full bg-[var(--ag-accent)]/0 transition-colors duration-[var(--ag-duration-fast)] hover:bg-[var(--ag-accent)]/40"
		style="cursor: {RESIZE_CURSORS.w}"
		aria-label={RESIZE_LABELS.w}
		onpointerdown={(e) => handleResizeStart(e, 'w')}
	></div>
	<!-- 左上 (nw) -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="absolute -left-1.5 -top-1.5 z-20 h-3 w-3 rounded-full border border-[var(--ag-border)] bg-[var(--ag-surface-1)] transition-transform duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:scale-125 hover:border-[var(--ag-accent)]"
		style="cursor: {RESIZE_CURSORS.nw}"
		aria-label={RESIZE_LABELS.nw}
		onpointerdown={(e) => handleResizeStart(e, 'nw')}
	></div>
	<!-- 右上 (ne): PH-issue-031 / 検収項目 #2 — 右上 × button (-right-3 -top-3) と
	     視覚位置が衝突するため ne resize handle は撤廃。
	     ne 方向リサイズは n + e の組合せで代替可能、× が右上の主役に。 -->
	<!-- 左下 (sw) -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="absolute -bottom-1.5 -left-1.5 z-20 h-3 w-3 rounded-full border border-[var(--ag-border)] bg-[var(--ag-surface-1)] transition-transform duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:scale-125 hover:border-[var(--ag-accent)]"
		style="cursor: {RESIZE_CURSORS.sw}"
		aria-label={RESIZE_LABELS.sw}
		onpointerdown={(e) => handleResizeStart(e, 'sw')}
	></div>
	<!-- 右下 (se) -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="absolute -bottom-1.5 -right-1.5 z-20 h-3 w-3 rounded-full border border-[var(--ag-border)] bg-[var(--ag-surface-1)] transition-transform duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:scale-125 hover:border-[var(--ag-accent)]"
		style="cursor: {RESIZE_CURSORS.se}"
		aria-label={RESIZE_LABELS.se}
		onpointerdown={(e) => handleResizeStart(e, 'se')}
	></div>
{/if}
