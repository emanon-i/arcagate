<script lang="ts">
import { Clock3, GitBranch, Grip, Star } from '@lucide/svelte';
import type { Component } from 'svelte';
import type { WidgetType, WorkspaceWidget } from '$lib/types/workspace';

let {
	widgets,
	onDragStart,
}: {
	widgets: WorkspaceWidget[];
	onDragStart: (type: WidgetType) => void;
} = $props();

const availableWidgets: { type: WidgetType; label: string; icon: Component }[] = [
	{ type: 'favorites', label: 'Favorites', icon: Star },
	{ type: 'recent', label: 'Recent', icon: Clock3 },
	{ type: 'projects', label: 'Projects', icon: GitBranch },
];

let placedTypes = $derived(new Set(widgets.map((w) => w.widget_type)));
</script>

<div class="w-48 space-y-2 rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] p-3">
	<h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">ウィジェット</h3>
	{#each availableWidgets as aw (aw.type)}
		{@const placed = placedTypes.has(aw.type)}
		{@const Icon = aw.icon}
		<button
			type="button"
			class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors {placed
				? 'cursor-default text-[var(--ag-text-faint)] opacity-50'
				: 'cursor-grab text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]'}"
			disabled={placed}
			draggable={!placed}
			ondragstart={(e) => {
				if (placed) return;
				e.dataTransfer?.setData('widget-type', aw.type);
				onDragStart(aw.type);
			}}
		>
			<Grip class="h-3.5 w-3.5 text-[var(--ag-text-faint)]" />
			<Icon class="h-4 w-4" />
			<span>{aw.label}</span>
		</button>
	{/each}
</div>
