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
}

let { onClose }: Props = $props();

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
				onpointerdown={(e) => startDrag(e, aw.type)}
				onclick={() => clickAdd(aw.type)}
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
