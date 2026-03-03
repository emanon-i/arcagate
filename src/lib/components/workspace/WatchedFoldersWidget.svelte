<script lang="ts">
import { invoke } from '@tauri-apps/api/core';
import { onMount } from 'svelte';
import type { WatchedPath } from '$lib/types/watched_path';

let paths = $state<WatchedPath[]>([]);
let error = $state<string | null>(null);

onMount(async () => {
	try {
		paths = await invoke<WatchedPath[]>('cmd_get_watched_paths');
	} catch (e) {
		error = String(e);
	}
});
</script>

<div class="flex flex-col gap-1">
	{#if error}
		<p class="text-sm text-destructive">{error}</p>
	{:else if paths.length === 0}
		<p class="text-sm text-muted-foreground">監視フォルダがありません</p>
	{:else}
		{#each paths as wp (wp.id)}
			<div class="flex items-center gap-2 rounded px-2 py-1 text-sm">
				<span class="truncate">{wp.label ?? wp.path}</span>
			</div>
		{/each}
	{/if}
</div>
