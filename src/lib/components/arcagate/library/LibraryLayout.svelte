<script lang="ts">
import LibraryDetailPanel from './LibraryDetailPanel.svelte';
import LibraryMainArea from './LibraryMainArea.svelte';
import LibrarySidebar from './LibrarySidebar.svelte';

interface Props {
	sidebarExpanded?: boolean;
	onEditItem?: (id: string) => void;
	onAddItem?: () => void;
}

let { sidebarExpanded = false, onEditItem, onAddItem }: Props = $props();

let selectedItemId: string | null = $state(null);
let activeTag: string | null = $state(null);

const base = 'flex h-full flex-col md:grid md:grid-rows-[1fr] bg-[var(--ag-surface-0)]';

let gridClass = $derived.by(() => {
	if (sidebarExpanded && selectedItemId) {
		return `${base} md:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-[200px_minmax(0,1fr)_340px]`;
	}
	if (sidebarExpanded) {
		return `${base} md:grid-cols-[200px_minmax(0,1fr)]`;
	}
	if (selectedItemId) {
		return `${base} md:grid-cols-[48px_minmax(0,1fr)] lg:grid-cols-[48px_minmax(0,1fr)_340px]`;
	}
	return `${base} md:grid-cols-[48px_minmax(0,1fr)]`;
});
</script>

<div class={gridClass}>
	<div class="hidden min-h-0 overflow-y-auto md:block" data-testid="library-sidebar-wrapper">
		<LibrarySidebar expanded={sidebarExpanded} {activeTag} onSelectTag={(id) => (activeTag = id)} />
	</div>
	<div class="min-h-0 overflow-y-auto" data-testid="library-main-wrapper">
		<LibraryMainArea {activeTag} onSelectItem={(id: string | null) => (selectedItemId = id)} {onAddItem} {onEditItem} />
	</div>
	{#if selectedItemId}
		<div class="hidden min-h-0 overflow-y-auto lg:block" data-testid="library-detail-wrapper">
			<LibraryDetailPanel {selectedItemId} {onEditItem} onClose={() => (selectedItemId = null)} />
		</div>
	{/if}
</div>
