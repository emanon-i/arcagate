<script lang="ts">
import { Check, Grip, Pencil, X } from '@lucide/svelte';
import type { Component } from 'svelte';
import { pointerDrag } from '$lib/state/pointer-drag.svelte';
import type { WidgetType } from '$lib/types/workspace';
import { widgetRegistry } from '$lib/widgets';

interface Props {
	editMode: boolean;
	onToggleEdit: () => void;
	onConfirmEdit: () => void;
	onCancelEdit: () => void;
}

let { editMode, onToggleEdit, onConfirmEdit, onCancelEdit }: Props = $props();

const rm =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// availableWidgets を widgetRegistry から派生（batch-83 PH-370）
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
</script>

<aside
	class="flex h-full flex-col border-r border-[var(--ag-border)] bg-[var(--ag-surface-2)]"
	style="width: {editMode ? '200px' : '48px'};{rm ? '' : ' transition: width var(--ag-duration-fast) var(--ag-ease-in-out);'}"
>
	{#if editMode}
		<!-- 編集モード: ウィジェットリスト -->
		<div class="flex flex-nowrap items-center justify-between border-b border-[var(--ag-border)] px-3 py-2">
			<span class="shrink-0 text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">追加</span>
			<div class="flex shrink-0 items-center gap-1">
				<button
					type="button"
					class="flex min-w-[3.5rem] shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-xs text-[var(--ag-text-muted)] transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)] hover:text-green-500"
					aria-label="編集を確定"
					onclick={onConfirmEdit}
				>
					<Check class="h-3.5 w-3.5 shrink-0" />
					完了
				</button>
				<button
					type="button"
					class="flex min-w-[3.5rem] shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-xs text-[var(--ag-text-muted)] transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)] hover:text-red-500"
					aria-label="編集をキャンセル"
					onclick={onCancelEdit}
				>
					<X class="h-3.5 w-3.5 shrink-0" />
					戻す
				</button>
			</div>
		</div>
		<div class="space-y-1 p-3">
			{#each availableWidgets as aw (aw.type)}
				{@const Icon = aw.icon}
				{@const isDragging = pointerDrag.active?.kind === 'add' && pointerDrag.active.widgetType === aw.type}
				<button
					type="button"
					class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--ag-text-secondary)] transition-[color,background-color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)]"
					class:cursor-grab={!isDragging}
					class:cursor-grabbing={isDragging}
					class:opacity-50={isDragging}
					data-widget-type={aw.type}
					onpointerdown={(e) => startDrag(e, aw.type)}
				>
					<Grip class="h-3.5 w-3.5 text-[var(--ag-text-faint)]" />
					<Icon class="h-4 w-4" />
					<span>{aw.label}</span>
				</button>
			{/each}
		</div>
	{:else}
		<!-- 閉じたモード: アイコンのみ -->
		<div class="flex flex-1 flex-col items-center py-3">
			<button
				type="button"
				class="rounded-lg p-2 text-[var(--ag-text-muted)] transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)]"
				aria-label="編集モード"
				onclick={onToggleEdit}
			>
				<Pencil class="h-4 w-4" />
			</button>
		</div>
	{/if}
</aside>
