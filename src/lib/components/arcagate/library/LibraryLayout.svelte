<script lang="ts">
import LibraryDetailPanel from './LibraryDetailPanel.svelte';
import LibraryMainArea from './LibraryMainArea.svelte';
import LibrarySidebar from './LibrarySidebar.svelte';

interface Props {
	onEditItem?: (id: string) => void;
	onAddItem?: () => void;
}

let { onEditItem, onAddItem }: Props = $props();

let selectedItemId: string | null = $state(null);
let activeCategory: string | null = $state(null);
</script>

<div
	class="flex h-full flex-col md:grid md:grid-cols-[200px_minmax(0,1fr)] md:grid-rows-[1fr] lg:grid-cols-[250px_minmax(0,1fr)_340px] bg-[var(--ag-surface-0)]"
>
	<div class="hidden min-h-0 overflow-y-auto md:block" data-testid="library-sidebar-wrapper">
		<LibrarySidebar {activeCategory} onSelectCategory={(id) => (activeCategory = id)} />
	</div>
	<div class="min-h-0 overflow-y-auto" data-testid="library-main-wrapper">
		<LibraryMainArea {activeCategory} onSelectItem={(id) => (selectedItemId = id)} {onAddItem} />
	</div>
	<div class="hidden min-h-0 overflow-y-auto lg:block" data-testid="library-detail-wrapper">
		<LibraryDetailPanel {selectedItemId} {onEditItem} onClose={() => (selectedItemId = null)} />
	</div>
</div>
