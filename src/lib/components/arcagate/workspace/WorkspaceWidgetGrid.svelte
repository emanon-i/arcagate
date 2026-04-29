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

	function onUp(_e: PointerEvent) {
		const cell = pointerDrag.dropCell;
		const src = pointerDrag.active;
		pointerDrag.end();

		if (!src) return;
		if (src.kind === 'add') {
			// 検収 #5/#6: drag drop か click かで分岐。click (cell 無し) は viewport 中央起点に
			// 自動配置、drag (cell あり) は指定セルに配置。click handler 二重発火は撤廃済 (Sidebar)。
			if (cell) {
				void workspaceStore.addWidgetAt(src.widgetType, cell.x, cell.y);
			} else {
				const near = viewportCenterCell() ?? undefined;
				void workspaceStore.addWidget(src.widgetType, near);
			}
		} else if (src.kind === 'move') {
			if (cell) {
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

// PH-issue-001: 編集モード時 Delete / Backspace で選択 widget を削除確認 (§13 規格)
function handleKeydown(e: KeyboardEvent) {
	if (!editMode || !selectedWidgetId) return;
	const target = e.target as HTMLElement | null;
	const isEditable =
		target &&
		(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
	if (isEditable) return;
	if (e.key === 'Delete' || e.key === 'Backspace') {
		e.preventDefault();
		onDeleteConfirmIdChange(selectedWidgetId);
	}
}

$effect(() => {
	if (!editMode) return;
	document.addEventListener('keydown', handleKeydown);
	return () => document.removeEventListener('keydown', handleKeydown);
});
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
