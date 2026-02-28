<script lang="ts">
import { listen } from '@tauri-apps/api/event';
import { onDestroy } from 'svelte';

let {
	onDrop,
}: {
	onDrop: (paths: string[]) => void;
} = $props();

let isDragging = $state(false);

const unlisten = listen<{ paths: string[] }>('tauri://drag-drop', (event) => {
	isDragging = false;
	if (event.payload.paths && event.payload.paths.length > 0) {
		onDrop(event.payload.paths);
	}
});

const unlistenOver = listen('tauri://drag-over', () => {
	isDragging = true;
});

const unlistenLeave = listen('tauri://drag-leave', () => {
	isDragging = false;
});

onDestroy(() => {
	unlisten.then((fn) => fn());
	unlistenOver.then((fn) => fn());
	unlistenLeave.then((fn) => fn());
});
</script>

<div
  class="flex min-h-32 w-full cursor-default flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors {isDragging
    ? 'border-primary bg-primary/5'
    : 'border-muted-foreground/30 hover:border-muted-foreground/50'}"
>
  <p class="text-sm text-muted-foreground">
    {#if isDragging}
      ここにドロップ
    {:else}
      ここにファイルをドロップ
    {/if}
  </p>
</div>
