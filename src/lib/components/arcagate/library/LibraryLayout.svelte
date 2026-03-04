<script lang="ts">
import LibraryDetailPanel from './LibraryDetailPanel.svelte';
import LibraryMainArea from './LibraryMainArea.svelte';
import LibrarySidebar from './LibrarySidebar.svelte';

// TODO: 選択状態を URL パラメータまたは Store で永続化
let selectedItemId: string | null = $state(null);
</script>

<div
	class="grid min-h-[760px] grid-cols-[250px_minmax(0,1fr)_340px] bg-[var(--ag-surface-0)]"
>
	<LibrarySidebar />
	<LibraryMainArea onSelectItem={(id) => (selectedItemId = id)} />
	<LibraryDetailPanel {selectedItemId} />
</div>
