<script lang="ts">
import { GripHorizontal, X } from '@lucide/svelte';
import { RESIZE_CURSORS, RESIZE_LABELS, type ResizeDir } from '$lib/utils/resize-delta';

interface Props {
	widgetId: string;
	onMoveStart: (e: PointerEvent, widgetId: string) => void;
	onResizeStart: (e: PointerEvent, widgetId: string, dir: ResizeDir) => void;
	onDeleteClick: (widgetId: string) => void;
}

let { widgetId, onMoveStart, onResizeStart, onDeleteClick }: Props = $props();

const corners: ResizeDir[] = ['nw', 'ne', 'sw', 'se'];
const edges: ResizeDir[] = ['n', 's', 'e', 'w'];

function edgePosClass(dir: ResizeDir): string {
	switch (dir) {
		case 'n':
			return 'left-1/2 top-0 h-2 w-16 -translate-x-1/2 -translate-y-1/2';
		case 's':
			return 'left-1/2 bottom-0 h-2 w-16 -translate-x-1/2 translate-y-1/2';
		case 'e':
			return 'right-0 top-1/2 h-16 w-2 -translate-y-1/2 translate-x-1/2';
		case 'w':
			return 'left-0 top-1/2 h-16 w-2 -translate-y-1/2 -translate-x-1/2';
		default:
			return '';
	}
}

function cornerPosClass(dir: ResizeDir): string {
	switch (dir) {
		case 'nw':
			return 'left-0 top-0 -translate-x-1/2 -translate-y-1/2';
		case 'ne':
			return 'right-0 top-0 translate-x-1/2 -translate-y-1/2';
		case 'sw':
			return 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2';
		case 'se':
			return 'right-0 bottom-0 translate-x-1/2 translate-y-1/2';
		default:
			return '';
	}
}
</script>

<!--
	Selection ring + corner / edge resize handles + move bar + delete button.
	Visible only when widget is selected in editMode (parent gates rendering).
	Style: shadcn 風 small square chips + floating × button.
-->

<!-- Selection ring overlay -->
<div
	class="pointer-events-none absolute inset-0 rounded-[var(--ag-radius-widget)] ring-2 ring-[var(--ag-accent)] ring-offset-2 ring-offset-[var(--ag-surface)]"
></div>

<!-- Move handle: top edge drag bar (普通の DTP / window 慣習) -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="absolute -top-3 left-1/2 z-30 flex h-6 w-20 -translate-x-1/2 cursor-grab items-center justify-center rounded-full border border-[var(--ag-border)] bg-[var(--ag-surface)] text-[var(--ag-text-muted)] shadow-sm transition-colors hover:bg-[var(--ag-surface-3)] active:cursor-grabbing"
	aria-label="ウィジェットを移動"
	onpointerdown={(e) => onMoveStart(e, widgetId)}
>
	<GripHorizontal class="h-3.5 w-3.5" />
</div>

<!-- PH-486: 削除 button をデフォルトで destructive 色に + サイズ微増 (24px → 28px)
	+ focus visible 強化。「削除可能」が一目で分かるように。 -->
<button
	type="button"
	class="absolute -right-3.5 -top-3.5 z-30 flex h-7 w-7 items-center justify-center rounded-full border-2 border-destructive bg-destructive/85 text-white shadow-md transition-[transform,background-color] duration-[var(--ag-duration-fast)] hover:scale-110 hover:bg-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ag-surface)]"
	aria-label="ウィジェットを削除"
	onclick={() => onDeleteClick(widgetId)}
>
	<X class="h-4 w-4" strokeWidth={2.5} />
</button>

<!-- Edge handles (4 sides): thin strip, transparent until hover -->
{#each edges as dir}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="absolute z-20 bg-transparent transition-colors hover:bg-[var(--ag-accent)]/30 {edgePosClass(
			dir,
		)}"
		style="cursor: {RESIZE_CURSORS[dir]}"
		aria-label={RESIZE_LABELS[dir]}
		onpointerdown={(e) => onResizeStart(e, widgetId, dir)}
	></div>
{/each}

<!-- Corner handles: small square chips (shadcn / Figma 慣習) -->
{#each corners as dir}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="absolute z-25 h-2.5 w-2.5 rounded-sm border-2 border-[var(--ag-surface)] bg-[var(--ag-accent)] shadow-sm transition-transform hover:scale-125 {cornerPosClass(
			dir,
		)}"
		style="cursor: {RESIZE_CURSORS[dir]}"
		aria-label={RESIZE_LABELS[dir]}
		onpointerdown={(e) => onResizeStart(e, widgetId, dir)}
	></div>
{/each}
