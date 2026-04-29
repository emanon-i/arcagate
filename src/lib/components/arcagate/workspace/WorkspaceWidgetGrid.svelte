<script lang="ts">
import type { Component } from 'svelte';
import { pointerDrag } from '$lib/state/pointer-drag.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { WIDGET_LABELS } from '$lib/types/workspace';
import { clampWidget } from '$lib/utils/widget-grid';
import WidgetHandles from './WidgetHandles.svelte';

interface Props {
	dynamicCols: number;
	maxRow: number;
	widgetW: number;
	widgetH: number;
	widgetComponents: Record<string, Component>;
	selectedWidgetId: string | null;
	deleteConfirmId: string | null;
	editMode?: boolean;
	/**
	 * PH-issue-024: 第 2 引数 ev で context menu の表示位置を取る (clientX/Y)。
	 * 旧 callback 互換のため引数 1 個でも呼べるが、新規実装は ev を受け取って x/y で popup 位置を決める。
	 */
	onItemContext: (itemId: string, ev?: MouseEvent) => void;
	onSelectedWidgetIdChange: (id: string | null) => void;
	onDeleteConfirmIdChange: (id: string | null) => void;
}

let {
	dynamicCols,
	maxRow,
	widgetW,
	widgetH,
	widgetComponents,
	selectedWidgetId,
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

// 4/30 user 検収 #1: Delete/Backspace の listener は WorkspaceLayout 側で集約。
// 旧実装はここでも document.addEventListener していたため、× button click 経由と
// keyboard 経由で removeWidget が二重に走る race があった。
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
			{@const isSelected = editMode && selectedWidgetId === widget.id}
			{#if WidgetComp}
				<!-- PH-issue-001: WidgetHandles を選択時のみマウント。
				     非選択 widget は通常表示のみ、handle / ring は出ない (P11 装飾は対象を邪魔しない)。 -->
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<div
					class="relative transition-opacity focus-visible:outline-none"
					class:opacity-60={isMoving}
					role="group"
					aria-label={WIDGET_LABELS[widget.widget_type] ?? widget.widget_type}
					tabindex={editMode ? 0 : -1}
					style="grid-column: {clamped.x + 1} / span {clamped.span}; grid-row: {widget.position_y + 1} / span {widget.height};"
					onclick={(e) => { e.stopPropagation(); onSelectedWidgetIdChange(widget.id); }}
					onfocus={() => onSelectedWidgetIdChange(widget.id)}
				>
					<WidgetComp {widget} {onItemContext} />
					{#if editMode}
						<WidgetHandles
							widgetId={widget.id}
							{isSelected}
							{dynamicCols}
							{widgetW}
							{widgetH}
							{onSelectedWidgetIdChange}
							{onDeleteConfirmIdChange}
						/>
					{/if}
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
