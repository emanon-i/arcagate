<script lang="ts">
import { Check, Clock3, GitBranch, Grip, Pencil, Star, X } from '@lucide/svelte';
import type { Component } from 'svelte';
import type { WidgetType } from '$lib/types/workspace';

interface Props {
	editMode: boolean;
	onToggleEdit: () => void;
	onConfirmEdit: () => void;
	onCancelEdit: () => void;
}

let { editMode, onToggleEdit, onConfirmEdit, onCancelEdit }: Props = $props();

const availableWidgets: { type: WidgetType; label: string; icon: Component }[] = [
	{ type: 'favorites', label: 'Favorites', icon: Star },
	{ type: 'recent', label: 'Recent', icon: Clock3 },
	{ type: 'projects', label: 'Projects', icon: GitBranch },
];

// Imperative dragstart action (Svelte 5 delegation may interfere with dataTransfer)
function dragWidget(node: HTMLElement, widgetType: WidgetType) {
	let handler = (e: DragEvent) => {
		e.dataTransfer?.setData('widget-type', widgetType);
	};
	node.addEventListener('dragstart', handler);
	return {
		update(newType: WidgetType) {
			node.removeEventListener('dragstart', handler);
			handler = (e: DragEvent) => {
				e.dataTransfer?.setData('widget-type', newType);
			};
			node.addEventListener('dragstart', handler);
		},
		destroy() {
			node.removeEventListener('dragstart', handler);
		},
	};
}
</script>

<aside
	class="flex h-full flex-col border-r border-[var(--ag-border)] bg-[var(--ag-surface-2)]"
	style="width: {editMode ? '200px' : '48px'}; transition: width 150ms ease;"
>
	{#if editMode}
		<!-- 編集モード: ウィジェットリスト -->
		<div class="flex items-center justify-between border-b border-[var(--ag-border)] px-3 py-2">
			<span class="text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">ウィジェット</span>
			<div class="flex items-center gap-1">
				<button
					type="button"
					class="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-4)] hover:text-green-500"
					aria-label="編集を確定"
					onclick={onConfirmEdit}
				>
					<Check class="h-3.5 w-3.5" />
					完了
				</button>
				<button
					type="button"
					class="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-4)] hover:text-red-500"
					aria-label="編集をキャンセル"
					onclick={onCancelEdit}
				>
					<X class="h-3.5 w-3.5" />
					戻す
				</button>
			</div>
		</div>
		<div class="space-y-1 p-3">
			{#each availableWidgets as aw (aw.type)}
				{@const Icon = aw.icon}
				<button
					type="button"
					class="flex w-full cursor-grab items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--ag-text-secondary)] transition-colors hover:bg-[var(--ag-surface-4)]"
					draggable="true"
					data-widget-type={aw.type}
					use:dragWidget={aw.type}
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
				class="rounded-lg p-2 text-[var(--ag-text-muted)] transition-colors hover:bg-[var(--ag-surface-4)]"
				aria-label="編集モード"
				onclick={onToggleEdit}
			>
				<Pencil class="h-4 w-4" />
			</button>
		</div>
	{/if}
</aside>
