<script lang="ts">
import { GripVertical, Trash2 } from '@lucide/svelte';
import type { Component } from 'svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import type { WidgetType } from '$lib/types/workspace';
import { clampWidget } from '$lib/utils/widget-grid';

interface Props {
	dynamicCols: number;
	maxRow: number;
	widgetW: number;
	widgetH: number;
	widgetComponents: Record<string, Component>;
	selectedWidgetId: string | null;
	deleteConfirmId: string | null;
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
	onItemContext,
	onSelectedWidgetIdChange,
	onDeleteConfirmIdChange,
}: Props = $props();

// Drag state (local — no need to lift to parent)
let movingWidget = $state<string | null>(null);
let dragOverCell = $state<{ x: number; y: number } | null>(null);
let dropZoneEl = $state<HTMLDivElement | null>(null);

function calcGridPosition(e: DragEvent): { x: number; y: number } {
	const ref = dropZoneEl;
	if (!ref) return { x: 0, y: 0 };
	const rect = ref.getBoundingClientRect();
	const relX = e.clientX - rect.left;
	const relY = e.clientY - rect.top;
	const gap = 16;
	const cellW = widgetW + gap;
	const cellH = widgetH + gap;
	const x = Math.max(0, Math.min(dynamicCols - 1, Math.floor(relX / cellW)));
	const y = Math.max(0, Math.floor(relY / cellH));
	return { x, y };
}

function handleDragOver(e: DragEvent) {
	e.preventDefault();
	if (e.dataTransfer) {
		// types is available during dragover (unlike getData which is security-restricted)
		e.dataTransfer.dropEffect = e.dataTransfer.types.includes('widget-move-id') ? 'move' : 'copy';
	}
	dragOverCell = calcGridPosition(e);
}

function handleDragLeave(e: DragEvent) {
	// Only clear when cursor truly leaves the drop zone (not just moving between children)
	if (!dropZoneEl?.contains(e.relatedTarget as Node)) {
		dragOverCell = null;
	}
}

function handleDrop(e: DragEvent) {
	e.preventDefault();
	dragOverCell = null;
	const pos = calcGridPosition(e);
	const widgetType = e.dataTransfer?.getData('widget-type') as WidgetType | undefined;
	const moveId = e.dataTransfer?.getData('widget-move-id');

	if (moveId) {
		void workspaceStore.moveWidget(moveId, pos.x, pos.y);
	} else if (widgetType && widgetType in widgetComponents) {
		void workspaceStore.addWidgetAt(widgetType, pos.x, pos.y);
	}
	movingWidget = null;
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
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('widget-move-id', widgetId);
		}
		movingWidget = widgetId;
		const ghost = document.createElement('div');
		ghost.style.cssText =
			'position:fixed;top:-200px;left:-200px;width:72px;height:36px;background:var(--ag-accent);opacity:0.75;border-radius:8px;pointer-events:none;';
		document.body.appendChild(ghost);
		e.dataTransfer?.setDragImage(ghost, 36, 18);
		requestAnimationFrame(() => ghost.remove());
	};
	let endHandler = () => {
		movingWidget = null;
	};
	node.addEventListener('dragstart', startHandler);
	node.addEventListener('dragend', endHandler);
	return {
		update(newId: string) {
			node.removeEventListener('dragstart', startHandler);
			node.removeEventListener('dragend', endHandler);
			startHandler = (e: DragEvent) => {
				if (e.dataTransfer) {
					e.dataTransfer.effectAllowed = 'move';
					e.dataTransfer.setData('widget-move-id', newId);
				}
				movingWidget = newId;
			};
			endHandler = () => {
				movingWidget = null;
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
</script>

<!-- L-3: Grid with overlay -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="relative"
	data-testid="workspace-drop-zone"
	bind:this={dropZoneEl}
	ondragover={handleDragOver}
	ondrop={handleDrop}
	ondragleave={handleDragLeave}
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
					style="grid-column: {clamped.x + 1} / span {clamped.span}; grid-row: {widget.position_y + 1} / span {widget.height};{selectedWidgetId === widget.id ? ' box-shadow: 0 0 0 2px var(--ag-surface), 0 0 0 4px var(--ag-accent); border-radius: var(--ag-radius-widget);' : ''}"
					onclick={(e) => { e.stopPropagation(); onSelectedWidgetIdChange(widget.id); }}
				>
					<WidgetComp {widget} {onItemContext} />
					<!-- ドラッグハンドル -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-sm bg-[var(--ag-surface-4)]/80 transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-surface-4)]"
						class:cursor-grab={movingWidget !== widget.id}
						class:cursor-grabbing={movingWidget === widget.id}
						draggable="true"
						use:dragMoveWidget={widget.id}
						aria-label="ウィジェットを移動"
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
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<!-- L-4: Resize handle (SE corner) -->
					<div
						class="absolute bottom-1 right-1 flex h-6 w-6 cursor-se-resize items-center justify-center rounded bg-[var(--ag-accent)]/50 shadow transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-accent)]"
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
