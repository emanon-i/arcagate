<script lang="ts">
import { invoke } from '@tauri-apps/api/core';
import { onMount } from 'svelte';
import type { Item } from '$lib/types/item';

let items = $state<Item[]>([]);
let error = $state<string | null>(null);

onMount(async () => {
	try {
		items = await invoke<Item[]>('cmd_get_frequent_items', { limit: 10 });
	} catch (e) {
		error = String(e);
	}
});

async function launch(item: Item) {
	try {
		await invoke('cmd_launch_item', { id: item.id, source: 'workspace' });
	} catch (e) {
		error = String(e);
	}
}
</script>

<div class="flex flex-col gap-1">
	{#if error}
		<p class="text-sm text-destructive">{error}</p>
	{:else if items.length === 0}
		<p class="text-sm text-muted-foreground">起動履歴がありません</p>
	{:else}
		{#each items as item (item.id)}
			<button
				class="flex items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-accent"
				onclick={() => launch(item)}
			>
				<span class="truncate">{item.label}</span>
			</button>
		{/each}
	{/if}
</div>
