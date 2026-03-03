<script lang="ts">
import type { Snippet } from 'svelte';
import { WIDGET_LABELS, type WorkspaceWidget } from '$lib/types/workspace';

interface Props {
	widget: WorkspaceWidget;
	onRemove: (id: string) => void;
	onResize: (id: string, width: number, height: number) => void;
	children: Snippet;
}

let { widget, onRemove, onResize, children }: Props = $props();

let cardEl: HTMLDivElement;
let tempWidth = $state(widget.width);
let tempHeight = $state(widget.height);

$effect(() => {
	tempWidth = widget.width;
	tempHeight = widget.height;
});

let startX = 0;
let startY = 0;
let startWidth = 0;
let startHeight = 0;
let cellW = 0;
let cellH = 0;

function startResize(e: MouseEvent) {
	e.preventDefault();
	e.stopPropagation();
	startX = e.clientX;
	startY = e.clientY;
	cellW = cardEl.offsetWidth / tempWidth;
	cellH = cardEl.offsetHeight / tempHeight;
	startWidth = tempWidth;
	startHeight = tempHeight;
	document.addEventListener('mousemove', onMouseMove);
	document.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(e: MouseEvent) {
	tempWidth = Math.max(1, Math.min(4, Math.round(startWidth + (e.clientX - startX) / cellW)));
	tempHeight = Math.max(1, Math.min(4, Math.round(startHeight + (e.clientY - startY) / cellH)));
}

function onMouseUp(e: MouseEvent) {
	document.removeEventListener('mousemove', onMouseMove);
	document.removeEventListener('mouseup', onMouseUp);
	const newW = Math.max(1, Math.min(4, Math.round(startWidth + (e.clientX - startX) / cellW)));
	const newH = Math.max(1, Math.min(4, Math.round(startHeight + (e.clientY - startY) / cellH)));
	if (newW !== startWidth || newH !== startHeight) {
		onResize(widget.id, newW, newH);
	}
}
</script>

<div
	bind:this={cardEl}
	class="relative flex flex-col rounded-lg border bg-card shadow-sm"
	style="grid-column: span {tempWidth}; grid-row: span {tempHeight};"
>
	<!-- ヘッダー (drag-handle) -->
	<div class="drag-handle flex cursor-grab items-center justify-between border-b px-3 py-2 active:cursor-grabbing">
		<span class="text-sm font-medium">{WIDGET_LABELS[widget.widget_type] ?? widget.widget_type}</span>
		<button
			class="rounded p-0.5 text-xs text-muted-foreground hover:text-destructive"
			onclick={() => onRemove(widget.id)}
			aria-label="ウィジェットを削除"
		>
			✕
		</button>
	</div>
	<!-- コンテンツ -->
	<div class="flex-1 overflow-auto p-3">
		{@render children()}
	</div>
	<!-- リサイズハンドル（右下） -->
	<div
		class="absolute bottom-1 right-1 flex h-4 w-4 cursor-se-resize items-center justify-center opacity-30 hover:opacity-80"
		onmousedown={startResize}
		role="presentation"
	>
		<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
			<path d="M8 2L2 8M8 6L6 8M8 4L4 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
		</svg>
	</div>
</div>
