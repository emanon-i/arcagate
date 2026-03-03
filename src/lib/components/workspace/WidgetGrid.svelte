<script lang="ts">
import { dragAndDrop } from '@formkit/drag-and-drop';
import type { WorkspaceWidget } from '$lib/types/workspace';
import FavoritesWidget from './FavoritesWidget.svelte';
import ProjectListWidget from './ProjectListWidget.svelte';
import RecentWidget from './RecentWidget.svelte';
import WatchedFoldersWidget from './WatchedFoldersWidget.svelte';
import WidgetCard from './WidgetCard.svelte';

interface Props {
	widgets: WorkspaceWidget[];
	onReorder: (ordered: WorkspaceWidget[]) => void;
	onRemove: (id: string) => void;
	onResize: (id: string, width: number, height: number) => void;
}

let { widgets, onReorder, onRemove, onResize }: Props = $props();

let gridEl = $state<HTMLDivElement | undefined>(undefined);
let localWidgets = $state<WorkspaceWidget[]>([]);

$effect(() => {
	localWidgets = [...widgets];
});

$effect(() => {
	if (!gridEl) return;
	dragAndDrop<WorkspaceWidget>({
		parent: gridEl,
		getValues: () => localWidgets,
		setValues: (v) => {
			localWidgets = v;
			onReorder(v);
		},
		config: {
			dragHandle: '.drag-handle',
		},
	});
});
</script>

<div
	bind:this={gridEl}
	class="auto-rows-[minmax(200px,auto)] grid grid-cols-4 gap-4"
>
	{#each localWidgets as widget (widget.id)}
		<WidgetCard {widget} {onRemove} {onResize}>
			{#if widget.widget_type === 'favorites'}
				<FavoritesWidget />
			{:else if widget.widget_type === 'recent'}
				<RecentWidget />
			{:else if widget.widget_type === 'projects'}
				<ProjectListWidget />
			{:else if widget.widget_type === 'watched_folders'}
				<WatchedFoldersWidget />
			{/if}
		</WidgetCard>
	{/each}
</div>
