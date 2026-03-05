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
	class="grid min-h-[760px] grid-cols-[250px_minmax(0,1fr)_340px] bg-[var(--ag-surface-0)]"
>
	<LibrarySidebar {activeCategory} onSelectCategory={(id) => (activeCategory = id)} />
	<LibraryMainArea {activeCategory} onSelectItem={(id) => (selectedItemId = id)} {onAddItem} />
	<LibraryDetailPanel {selectedItemId} {onEditItem} />
</div>
