<script lang="ts">
import { Grip, PanelLeftClose } from '@lucide/svelte';
import type { Component } from 'svelte';
import { pointerDrag } from '$lib/state/pointer-drag.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import type { WidgetType } from '$lib/types/workspace';
import { widgetRegistry } from '$lib/widgets';

/**
 * PH-issue-002: 編集モード撤廃に伴い、Sidebar は常時 widget add panel として表示。
 * 旧 editMode toggle / 確定 / キャンセル button は廃止 (即時保存方針)。
 *
 * PH-issue-028 / 検収項目 #1: open/close toggle 復活。
 * close 時は sidebar を完全非表示、再表示は外部の toggle button (WorkspaceLayout) から。
 */

interface Props {
	onClose?: () => void;
	/**
	 * 4/30 user 検収 #5: click 経路の addWidget は viewport 中央起点で配置したいため、
	 * parent (WorkspaceLayout) が container ref を見て viewport cell を計算する。
	 * 未指定なら従来の `workspaceStore.addWidget(type)` (左上から空き探索) で fallback。
	 */
	onAddWidget?: (widgetType: WidgetType) => void;
}

let { onClose, onAddWidget }: Props = $props();

const availableWidgets: { type: WidgetType; label: string; icon: Component }[] = Object.entries(
	widgetRegistry,
)
	.filter(([, meta]) => meta?.addable)
	.map(([type, meta]) => ({
		type: type as WidgetType,
		label: meta?.label,
		icon: meta?.icon,
	}));

// 4/30 user 検収 #6: click と drag が同居していた旧実装は、click 経路 (addWidget) と
// drag 経路 (addWidgetAt) が両方 fire して widget が二重追加されていた。
// 業界標準 (HTML5 D&D / Apple HIG) どおり 5px しきい値で排他: 5px 未満 = click、5px 以上 = drag。
const DRAG_THRESHOLD_PX = 5;
let pointerDownPos = $state<{ x: number; y: number; widgetType: WidgetType } | null>(null);

function onItemPointerDown(e: PointerEvent, widgetType: WidgetType) {
	e.preventDefault();
	pointerDownPos = { x: e.clientX, y: e.clientY, widgetType };
}

function onItemPointerMove(e: PointerEvent) {
	if (!pointerDownPos || pointerDrag.active) return;
	const dx = e.clientX - pointerDownPos.x;
	const dy = e.clientY - pointerDownPos.y;
	if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
		const wt = pointerDownPos.widgetType;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		pointerDrag.start({ kind: 'add', widgetType: wt }, e.clientX, e.clientY);
		pointerDownPos = null;
	}
}

function onItemPointerUp(_e: PointerEvent, widgetType: WidgetType) {
	if (pointerDownPos) {
		// drag に切り替わってない (5px 未満) = click として addWidget
		pointerDownPos = null;
		if (onAddWidget) {
			onAddWidget(widgetType);
		} else {
			void workspaceStore.addWidget(widgetType);
		}
		return;
	}
	// drag に切替済の場合は WorkspaceWidgetGrid の document-level pointerup listener が処理する
}

function onItemPointerCancel() {
	pointerDownPos = null;
}
</script>

<aside
	class="flex h-full w-[200px] flex-col border-r border-[var(--ag-border)] bg-[var(--ag-surface-2)]"
>
	<div class="flex items-center justify-between border-b border-[var(--ag-border)] px-3 py-2">
		<span
			class="text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]"
		>
			ウィジェットを追加
		</span>
		{#if onClose}
			<button
				type="button"
				class="rounded p-0.5 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)]"
				aria-label="ウィジェットパネルを閉じる"
				title="閉じる"
				onclick={onClose}
			>
				<PanelLeftClose class="h-4 w-4" />
			</button>
		{/if}
	</div>
	<!-- PH-widget-polish: hover で grip icon 明色化 + label 強調、active:scale-[0.97]、
	     title で「クリックで追加 / ドラッグで配置」hint、widget label に min-w-0 truncate。 -->
	<div class="space-y-1 p-3">
		{#each availableWidgets as aw (aw.type)}
			{@const Icon = aw.icon}
			{@const isDragging =
				pointerDrag.active?.kind === 'add' && pointerDrag.active.widgetType === aw.type}
			<button
				type="button"
				class="group/add flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--ag-text-secondary)] transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)] hover:text-[var(--ag-text-primary)]"
				class:cursor-grab={!isDragging}
				class:cursor-grabbing={isDragging}
				class:opacity-50={isDragging}
				data-widget-type={aw.type}
				aria-label="{aw.label} を追加"
				title="クリックで追加 / ドラッグで配置"
				onpointerdown={(e) => onItemPointerDown(e, aw.type)}
				onpointermove={onItemPointerMove}
				onpointerup={(e) => onItemPointerUp(e, aw.type)}
				onpointercancel={onItemPointerCancel}
			>
				<Grip
					class="h-3.5 w-3.5 shrink-0 text-[var(--ag-text-faint)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none group-hover/add:text-[var(--ag-text-muted)]"
				/>
				<Icon class="h-4 w-4 shrink-0" />
				<span class="min-w-0 flex-1 truncate text-left">{aw.label}</span>
			</button>
		{/each}
	</div>
</aside>
