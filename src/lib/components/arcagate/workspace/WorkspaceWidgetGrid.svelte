<script lang="ts">
import { GripVertical, Trash2 } from '@lucide/svelte';
import type { Component } from 'svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';

interface Props {
	dynamicCols: number;
	maxRow: number;
	widgetW: number;
	widgetH: number;
	widgetComponents: Record<string, Component>;
	selectedWidgetId: string | null;
	movingWidget: string | null;
	deleteConfirmId: string | null;
	dragOverCell: { x: number; y: number } | null;
	dropZoneEl?: HTMLDivElement | null;
	onItemContext: (itemId: string) => void;
	onSelectedWidgetIdChange: (id: string | null) => void;
	onMovingWidgetChange: (id: string | null) => void;
	onDeleteConfirmIdChange: (id: string | null) => void;
	onDragOverCellChange: (cell: { x: number; y: number } | null) => void;
	onDropZoneElChange: (el: HTMLDivElement | null) => void;
}

const MAX_SPAN = 4;

let {
	dynamicCols,
	maxRow,
	widgetW,
	widgetH,
	widgetComponents,
	selectedWidgetId,
	movingWidget,
	deleteConfirmId,
	dragOverCell,
	onItemContext,
	onSelectedWidgetIdChange,
	onMovingWidgetChange,
	onDeleteConfirmIdChange,
	onDragOverCellChange,
	onDropZoneElChange,
}: Props = $props();

function clampWidget(widget: { position_x: number; width: number }, cols: number) {
	const x = Math.min(widget.position_x, Math.max(0, cols - 1));
	const span = Math.max(1, Math.min(widget.width, cols - x));
	return { x, span };
}

function handleResizeStart(e: PointerEvent, widgetId: string) {
	e.preventDefault();
	const handle = e.currentTarget as HTMLElement;
	handle.setPointerCapture(e.pointerId);

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
		const w = workspaceStore.widgets.find((ww) => ww.id === widgetId);
		if (w) void workspaceStore.resizeWidget(widgetId, w.width, w.height);
		handle.removeEventListener('pointermove', onMove);
		handle.removeEventListener('pointerup', onUp);
	}

	handle.addEventListener('pointermove', onMove);
	handle.addEventListener('pointerup', onUp);
}

function dragMoveWidget(node: HTMLElement, widgetId: string) {
	let startHandler = (e: DragEvent) => {
		e.dataTransfer?.setData('widget-move-id', widgetId);
		onMovingWidgetChange(widgetId);
		const ghost = document.createElement('div');
		ghost.style.cssText =
			'position:fixed;top:-200px;left:-200px;width:72px;height:36px;background:var(--ag-accent);opacity:0.75;border-radius:8px;pointer-events:none;';
		document.body.appendChild(ghost);
		e.dataTransfer?.setDragImage(ghost, 36, 18);
		requestAnimationFrame(() => ghost.remove());
	};
	let endHandler = () => {
		onMovingWidgetChange(null);
	};
	node.addEventListener('dragstart', startHandler);
	node.addEventListener('dragend', endHandler);
	return {
		update(newId: string) {
			node.removeEventListener('dragstart', startHandler);
			node.removeEventListener('dragend', endHandler);
			startHandler = (e: DragEvent) => {
				e.dataTransfer?.setData('widget-move-id', newId);
				onMovingWidgetChange(newId);
			};
			endHandler = () => {
				onMovingWidgetChange(null);
			};
			node.addEventListener('dragstart', startHandler);
			node.addEventListener('dragend', endHandler);
		},
		destroy() {
			node.removeEventListener('dragstart', startHandler);
			node.removeEventListener('dragend', endHandler);
		},
	};
}

let dropZoneEl = $state<HTMLDivElement | null>(null);
$effect(() => {
	onDropZoneElChange(dropZoneEl);
});
</script>

<!-- L-3: Grid with overlay -->
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
			{#if WidgetComp}
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div
					class="relative transition-opacity"
					class:opacity-60={movingWidget === widget.id}
					role="group"
					aria-label={widget.widget_type}
					style="grid-column: {clamped.x + 1} / span {clamped.span}; grid-row: {widget.position_y + 1} / span {widget.height};{selectedWidgetId === widget.id ? ' outline: 2px solid var(--ag-accent); outline-offset: 3px; border-radius: var(--ag-radius-widget);' : ''}"
					onclick={(e) => { e.stopPropagation(); onSelectedWidgetIdChange(widget.id); }}
				>
					<WidgetComp {widget} {onItemContext} />
					<!-- ドラッグハンドル -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-sm bg-[var(--ag-surface-4)]/80 hover:bg-[var(--ag-surface-4)]"
						class:cursor-grab={movingWidget !== widget.id}
						class:cursor-grabbing={movingWidget === widget.id}
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
						onclick={() => onDeleteConfirmIdChange(widget.id)}
					>
						<Trash2 class="h-3 w-3" />
					</button>
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<!-- L-4: Resize handle (SE corner) -->
					<div
						class="absolute bottom-1 right-1 flex h-6 w-6 cursor-se-resize items-center justify-center rounded bg-[var(--ag-accent)]/50 shadow hover:bg-[var(--ag-accent)]"
						aria-label="リサイズ"
						onpointerdown={(e) => handleResizeStart(e, widget.id)}
						ondragstart={(e) => { e.preventDefault(); e.stopPropagation(); }}
					>
						<GripVertical class="h-4 w-4 text-white" />
					</div>
				</div>
			{/if}
		{/each}

		<!-- Drop zone highlight -->
		{#if dragOverCell}
			<div
				class="pointer-events-none rounded-lg border-2 border-dashed border-[var(--ag-accent)] bg-[var(--ag-accent)]/10 shadow-[0_0_0_2px_var(--ag-accent)]"
				style="grid-column: {dragOverCell.x + 1}; grid-row: {dragOverCell.y + 1};"
			></div>
		{/if}
	</div>
</div>
