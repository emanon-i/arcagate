<script lang="ts">
import { emit, listen } from '@tauri-apps/api/event';
import { onDestroy } from 'svelte';
import ToastContainer from '$lib/components/arcagate/common/ToastContainer.svelte';
import PaletteOverlay from '$lib/components/arcagate/palette/PaletteOverlay.svelte';
import { itemStore } from '$lib/state/items.svelte';
import { paletteStore } from '$lib/state/palette.svelte';
import { themeStore } from '$lib/state/theme.svelte';

let paletteOpen = $state(true);

$effect(() => {
	void themeStore.loadTheme();
	void itemStore.loadItems();
	void itemStore.loadCategories();
	void itemStore.loadTags();
});

// palette-open イベントで再度開く（ホットキー再トリガー時）
let unlistenOpen: (() => void) | null = null;
listen('palette-open', () => {
	paletteOpen = true;
	paletteStore.open();
	void paletteStore.search('');
}).then((fn) => {
	unlistenOpen = fn;
});

onDestroy(() => {
	unlistenOpen?.();
});

function handleClose() {
	paletteOpen = false;
	void emit('palette-close');
}
</script>

<svelte:head>
	<style>
		html,
		body {
			background: transparent !important;
		}
	</style>
</svelte:head>

<PaletteOverlay bind:open={paletteOpen} mode="floating" onClose={handleClose} />
<ToastContainer />
