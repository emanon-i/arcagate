<script lang="ts">
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
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

async function handleClickFile() {
	const selected = await open({
		multiple: false,
		filters: [
			{
				name: '実行ファイル',
				extensions: ['exe', 'msi', 'com', 'ps1', 'bat', 'cmd', 'sh', 'py', 'js'],
			},
			{ name: 'すべて', extensions: ['*'] },
		],
	});
	if (selected) {
		onDrop([selected]);
	}
}

async function handleClickFolder() {
	const selected = await open({
		directory: true,
		multiple: false,
	});
	if (selected) {
		onDrop([selected]);
	}
}
</script>

<div
  class="flex min-h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors {isDragging
    ? 'border-primary bg-primary/5'
    : 'border-muted-foreground/30 hover:border-muted-foreground/50'}"
>
  <p class="text-sm text-muted-foreground">
    {#if isDragging}
      ここにドロップ
    {:else}
      ここにファイルをドロップ、またはクリックして選択
    {/if}
  </p>
  <div class="flex gap-2">
    <button
      type="button"
      class="rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-1.5 text-xs text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]"
      onclick={handleClickFile}
    >
      ファイルを選択
    </button>
    <button
      type="button"
      class="rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-1.5 text-xs text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]"
      onclick={handleClickFolder}
    >
      フォルダを選択
    </button>
  </div>
</div>
