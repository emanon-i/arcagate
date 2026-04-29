<script lang="ts">
import type { Component } from 'svelte';
import { pointerDrag } from '$lib/state/pointer-drag.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { WIDGET_LABELS } from '$lib/types/workspace';
import { clampWidget, wouldOverlapAt } from '$lib/utils/widget-grid';
import { widgetRegistry } from '$lib/widgets';
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
			// 検収 #5/#6 + Codex r3 #1: 配置経路に dynamicCols を渡し、preview の bounds と一致させる
			// (responsive widt で 5 列以上ある時、addWidgetAt が fix=4 で reject していた regression を解消)。
			if (cell) {
				void workspaceStore.addWidgetAt(src.widgetType, cell.x, cell.y, dynamicCols);
			} else {
				const near = viewportCenterCell() ?? undefined;
				void workspaceStore.addWidget(src.widgetType, near, dynamicCols);
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

		<!-- Codex High #4 + 再 review #2: Drop preview highlight を defaultSize / 移動元実 size に合わせる。
		     overlap 事前判定 + grid 右端越え判定で accent (free) / destructive (blocked / 越境) を色分け。
		     **width clamp はせず、span は previewSize.w 全幅で出す**（右端で grid 外にはみ出すが、その時は
		     blocked 色で「ここには配置できない」と視覚的に伝える）。 -->
		{#if pointerDrag.dropCell && pointerDrag.active}
			{@const cell = pointerDrag.dropCell}
			{@const previewSize =
				pointerDrag.active.kind === 'add'
					? (widgetRegistry[pointerDrag.active.widgetType]?.defaultSize ?? { w: 2, h: 2 })
					: (() => {
							const moving = workspaceStore.widgets.find(
								(w) => pointerDrag.active?.kind === 'move' && w.id === pointerDrag.active.widgetId,
							);
							return moving ? { w: moving.width, h: moving.height } : { w: 2, h: 2 };
						})()}
			{@const others = workspaceStore.widgets
				.filter((w) =>
					pointerDrag.active?.kind === 'move' ? w.id !== pointerDrag.active.widgetId : true,
				)
				.map((w) => ({ x: w.position_x, y: w.position_y, w: w.width, h: w.height }))}
			{@const overflowsRight = cell.x + previewSize.w > dynamicCols}
			{@const blocked =
				overflowsRight ||
				wouldOverlapAt(cell.x, cell.y, previewSize.w, previewSize.h, others)}
			{@const colorVar = blocked ? 'var(--ag-error-text)' : 'var(--ag-accent)'}
			<div
				class="pointer-events-none rounded-lg border-2 border-dashed transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none"
				style="
					grid-column: {cell.x + 1} / span {previewSize.w};
					grid-row: {cell.y + 1} / span {previewSize.h};
					border-color: {colorVar};
					background: color-mix(in srgb, {colorVar} 10%, transparent);
					box-shadow: 0 0 0 2px {colorVar};
				"
			></div>
		{/if}
	</div>
</div>
