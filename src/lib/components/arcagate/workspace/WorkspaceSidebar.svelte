<script lang="ts">
import { Grip } from '@lucide/svelte';
import type { Component } from 'svelte';
import { pointerDrag } from '$lib/state/pointer-drag.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import type { WidgetType } from '$lib/types/workspace';
import { widgetRegistry } from '$lib/widgets';

/**
 * PH-issue-002: 編集モード撤廃に伴い、Sidebar は常時 widget add panel として表示。
 * 旧 editMode toggle / 確定 / キャンセル button は廃止 (即時保存方針)。
 */

const availableWidgets: { type: WidgetType; label: string; icon: Component }[] = Object.entries(
	widgetRegistry,
)
	.filter(([, meta]) => meta?.addable)
	.map(([type, meta]) => ({
		type: type as WidgetType,
		label: meta?.label,
		icon: meta?.icon,
	}));

function startDrag(e: PointerEvent, widgetType: WidgetType) {
	e.preventDefault();
	(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	pointerDrag.start({ kind: 'add', widgetType }, e.clientX, e.clientY);
}

function clickAdd(widgetType: WidgetType) {
	void workspaceStore.addWidget(widgetType);
}
</script>

<aside
	class="flex h-full w-[200px] flex-col border-r border-[var(--ag-border)] bg-[var(--ag-surface-2)]"
>
	<div class="border-b border-[var(--ag-border)] px-3 py-2">
		<span
			class="text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]"
		>
			ウィジェットを追加
		</span>
	</div>
	<div class="space-y-1 p-3">
		{#each availableWidgets as aw (aw.type)}
			{@const Icon = aw.icon}
			{@const isDragging =
				pointerDrag.active?.kind === 'add' && pointerDrag.active.widgetType === aw.type}
			<button
				type="button"
				class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--ag-text-secondary)] transition-[color,background-color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)]"
				class:cursor-grab={!isDragging}
				class:cursor-grabbing={isDragging}
				class:opacity-50={isDragging}
				data-widget-type={aw.type}
				aria-label="{aw.label} を追加"
				onpointerdown={(e) => startDrag(e, aw.type)}
				onclick={() => clickAdd(aw.type)}
			>
				<Grip class="h-3.5 w-3.5 text-[var(--ag-text-faint)]" />
				<Icon class="h-4 w-4" />
				<span>{aw.label}</span>
			</button>
		{/each}
	</div>
</aside>
