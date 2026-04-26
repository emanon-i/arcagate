<script lang="ts">
import { GripVertical, Trash2 } from '@lucide/svelte';
import type { Component } from 'svelte';
import { pointerDrag } from '$lib/state/pointer-drag.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { WIDGET_LABELS } from '$lib/types/workspace';
import {
	clampResizeForOverlap,
	computeResize,
	RESIZE_CURSORS,
	RESIZE_LABELS,
	type ResizeDir,
} from '$lib/utils/resize-delta';
import { clampWidget } from '$lib/utils/widget-grid';

interface Props {
	dynamicCols: number;
	maxRow: number;
	widgetW: number;
	widgetH: number;
	widgetComponents: Record<string, Component>;
	selectedWidgetId: string | null;
	deleteConfirmId: string | null;
	editMode?: boolean;
	onItemContext: (itemId: string) => void;
	onSelectedWidgetIdChange: (id: string | null) => void;
	onDeleteConfirmIdChange: (id: string | null) => void;
}

const MAX_SPAN = 4;

let {
	dynamicCols,
	maxRow,
	widgetW,
	widgetH,
	widgetComponents,
	selectedWidgetId,
	deleteConfirmId,
	editMode = true,
	onItemContext,
	onSelectedWidgetIdChange,
	onDeleteConfirmIdChange,
}: Props = $props();

let dropZoneEl = $state<HTMLDivElement | null>(null);

function calcDropCell(clientX: number, clientY: number): { x: number; y: number } {
	const ref = dropZoneEl;
	if (!ref) return { x: 0, y: 0 };
	const rect = ref.getBoundingClientRect();
	const relX = clientX - rect.left;
	const relY = clientY - rect.top;
	const gap = 16;
	const cellW = widgetW + gap;
	const cellH = widgetH + gap;
	const x = Math.max(0, Math.min(dynamicCols - 1, Math.floor(relX / cellW)));
	const y = Math.max(0, Math.floor(relY / cellH));
	return { x, y };
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

	function onMove(e: PointerEvent) {
		pointerDrag.move(e.clientX, e.clientY);
		if (isOverDropZone(e.clientX, e.clientY)) {
			pointerDrag.setDropCell(calcDropCell(e.clientX, e.clientY));
		} else {
			pointerDrag.setDropCell(null);
		}
	}

	function onUp(_e: PointerEvent) {
		const cell = pointerDrag.dropCell;
		const src = pointerDrag.active;
		pointerDrag.end();

		if (cell && src) {
			if (src.kind === 'add') {
				void workspaceStore.addWidgetAt(src.widgetType, cell.x, cell.y);
			} else if (src.kind === 'move') {
				void workspaceStore.moveWidget(src.widgetId, cell.x, cell.y);
			}
		}
	}

	document.addEventListener('pointermove', onMove);
	document.addEventListener('pointerup', onUp);
	document.addEventListener('pointercancel', onUp);

	return () => {
		document.removeEventListener('pointermove', onMove);
		document.removeEventListener('pointerup', onUp);
		document.removeEventListener('pointercancel', onUp);
	};
});

function handleResizeStart(e: PointerEvent, widgetId: string, dir: ResizeDir = 'se') {
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
		// 他ウィジェットと重なる場合は重ならない最大に丸める（rubber-band）
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
			void workspaceStore.persistMoveAndResize(
				widgetId,
				w.position_x,
				w.position_y,
				w.width,
				w.height,
			);
		}
		handle.removeEventListener('pointermove', onMove);
		handle.removeEventListener('pointerup', onUp);
	}

	handle.addEventListener('pointermove', onMove);
	handle.addEventListener('pointerup', onUp);
}

function handleMoveStart(e: PointerEvent, widgetId: string) {
	e.preventDefault();
	e.stopPropagation();
	(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	pointerDrag.start({ kind: 'move', widgetId }, e.clientX, e.clientY);
}
</script>

<!-- L-3: Grid with overlay -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="relative"
	data-testid="workspace-drop-zone"
	bind:this={dropZoneEl}
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
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="absolute inset-0 z-10"
		style="display: grid; grid-template-columns: repeat({dynamicCols}, var(--widget-w)); grid-auto-rows: var(--widget-h); gap: 16px;"
		onclick={() => { onSelectedWidgetIdChange(null); }}
	>
		{#each workspaceStore.widgets as widget (widget.id)}
			{@const WidgetComp = widgetComponents[widget.widget_type as keyof typeof widgetComponents]}
			{@const clamped = clampWidget(widget, dynamicCols)}
			{@const isMoving = pointerDrag.active?.kind === 'move' && pointerDrag.active.widgetId === widget.id}
			{#if WidgetComp}
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<div
					class="relative transition-opacity focus-visible:outline-none"
					class:opacity-60={isMoving}
					role="group"
					aria-label={WIDGET_LABELS[widget.widget_type] ?? widget.widget_type}
					tabindex={editMode ? 0 : -1}
					style="grid-column: {clamped.x + 1} / span {clamped.span}; grid-row: {widget.position_y + 1} / span {widget.height};{selectedWidgetId === widget.id ? ' box-shadow: 0 0 0 2px var(--ag-surface), 0 0 0 4px var(--ag-accent); border-radius: var(--ag-radius-widget);' : ''}"
					onclick={(e) => { e.stopPropagation(); onSelectedWidgetIdChange(widget.id); }}
					onfocus={() => onSelectedWidgetIdChange(widget.id)}
				>
					<WidgetComp {widget} {onItemContext} />
					<!-- ドラッグハンドル (PointerEvent ベース) -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-sm bg-[var(--ag-surface-4)]/80 transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-surface-4)]"
						class:cursor-grab={!isMoving}
						class:cursor-grabbing={isMoving}
						aria-label="ウィジェットを移動"
						onpointerdown={(e) => handleMoveStart(e, widget.id)}
					>
						<GripVertical class="h-3 w-3 text-[var(--ag-text-muted)]" />
					</div>
					<!-- 削除ボタン -->
					<button
						type="button"
						class="absolute right-1 top-1 rounded-full bg-destructive/80 p-1 text-white transition-[background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-destructive active:scale-[0.95]"
						aria-label="ウィジェットを削除"
						onclick={() => onDeleteConfirmIdChange(widget.id)}
					>
						<Trash2 class="h-3 w-3" />
					</button>
					<!-- PH-331: 8 方向 Resize handles (n/s/e/w + 4 corners) -->
					<!-- 上辺 (n) -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="absolute left-1/2 top-0 z-10 h-2 w-12 -translate-x-1/2 bg-[var(--ag-accent)]/0 transition-colors duration-[var(--ag-duration-fast)] hover:bg-[var(--ag-accent)]/40"
						style="cursor: {RESIZE_CURSORS.n}"
						aria-label={RESIZE_LABELS.n}
						onpointerdown={(e) => handleResizeStart(e, widget.id, 'n')}
					></div>
					<!-- 下辺 (s) -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="absolute bottom-0 left-1/2 z-10 h-2 w-12 -translate-x-1/2 bg-[var(--ag-accent)]/0 transition-colors duration-[var(--ag-duration-fast)] hover:bg-[var(--ag-accent)]/40"
						style="cursor: {RESIZE_CURSORS.s}"
						aria-label={RESIZE_LABELS.s}
						onpointerdown={(e) => handleResizeStart(e, widget.id, 's')}
					></div>
					<!-- 右辺 (e) -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="absolute right-0 top-1/2 z-10 h-12 w-2 -translate-y-1/2 bg-[var(--ag-accent)]/0 transition-colors duration-[var(--ag-duration-fast)] hover:bg-[var(--ag-accent)]/40"
						style="cursor: {RESIZE_CURSORS.e}"
						aria-label={RESIZE_LABELS.e}
						onpointerdown={(e) => handleResizeStart(e, widget.id, 'e')}
					></div>
					<!-- 左辺 (w) -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="absolute left-0 top-1/2 z-10 h-12 w-2 -translate-y-1/2 bg-[var(--ag-accent)]/0 transition-colors duration-[var(--ag-duration-fast)] hover:bg-[var(--ag-accent)]/40"
						style="cursor: {RESIZE_CURSORS.w}"
						aria-label={RESIZE_LABELS.w}
						onpointerdown={(e) => handleResizeStart(e, widget.id, 'w')}
					></div>
					<!-- 左上 (nw) -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="absolute left-0 top-0 z-15 h-3 w-3 bg-[var(--ag-accent)]/0 transition-colors duration-[var(--ag-duration-fast)] hover:bg-[var(--ag-accent)]/40"
						style="cursor: {RESIZE_CURSORS.nw}"
						aria-label={RESIZE_LABELS.nw}
						onpointerdown={(e) => handleResizeStart(e, widget.id, 'nw')}
					></div>
					<!-- 右上 (ne) -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="absolute right-0 top-0 z-15 h-3 w-3 bg-[var(--ag-accent)]/0 transition-colors duration-[var(--ag-duration-fast)] hover:bg-[var(--ag-accent)]/40"
						style="cursor: {RESIZE_CURSORS.ne}"
						aria-label={RESIZE_LABELS.ne}
						onpointerdown={(e) => handleResizeStart(e, widget.id, 'ne')}
					></div>
					<!-- 左下 (sw) -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="absolute bottom-0 left-0 z-15 h-3 w-3 bg-[var(--ag-accent)]/0 transition-colors duration-[var(--ag-duration-fast)] hover:bg-[var(--ag-accent)]/40"
						style="cursor: {RESIZE_CURSORS.sw}"
						aria-label={RESIZE_LABELS.sw}
						onpointerdown={(e) => handleResizeStart(e, widget.id, 'sw')}
					></div>
					<!-- 右下 (se) -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="absolute bottom-1 right-1 z-20 flex h-6 w-6 items-center justify-center rounded bg-[var(--ag-accent)]/50 shadow transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-accent)]"
						style="cursor: {RESIZE_CURSORS.se}"
						aria-label={RESIZE_LABELS.se}
						onpointerdown={(e) => handleResizeStart(e, widget.id, 'se')}
					>
						<GripVertical class="h-4 w-4 text-white" />
					</div>
				</div>
			{/if}
		{/each}

		<!-- Drop zone highlight -->
		{#if pointerDrag.dropCell}
			<div
				class="pointer-events-none rounded-lg border-2 border-dashed border-[var(--ag-accent)] bg-[var(--ag-accent)]/10 shadow-[0_0_0_2px_var(--ag-accent)]"
				style="grid-column: {pointerDrag.dropCell.x + 1}; grid-row: {pointerDrag.dropCell.y + 1};"
			></div>
		{/if}
	</div>
</div>
