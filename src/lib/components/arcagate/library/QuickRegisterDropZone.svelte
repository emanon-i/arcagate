<script lang="ts">
import { Plus } from '@lucide/svelte';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { onDestroy } from 'svelte';

let {
	onDrop,
}: {
	onDrop?: (paths: string[]) => void;
} = $props();

let isDragging = $state(false);

const unlistenOver = listen('tauri://drag-over', () => {
	isDragging = true;
});

const unlistenLeave = listen('tauri://drag-leave', () => {
	isDragging = false;
});

const unlistenDrop = listen('tauri://drag-drop', () => {
	isDragging = false;
});

onDestroy(() => {
	unlistenOver.then((fn) => fn());
	unlistenLeave.then((fn) => fn());
	unlistenDrop.then((fn) => fn());
});

async function handleClick() {
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
	if (selected && onDrop) {
		onDrop([selected]);
	}
}
</script>

<button
	type="button"
	class="w-full rounded-[var(--ag-radius-widget)] border border-dashed p-4 text-left transition-[border-color,background-color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {isDragging
		? 'border-[var(--ag-accent)] bg-[var(--ag-accent)]/10'
		: 'border-[var(--ag-border-dashed)] bg-[var(--ag-surface-2)] hover:border-[var(--ag-accent)]/50'}"
	onclick={handleClick}
>
	<div class="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--ag-text-primary)]">
		<Plus class="h-4 w-4" />
		クイック登録
	</div>
	<p class="text-xs leading-5 text-[var(--ag-text-muted)]">
		{#if isDragging}
			ここにドロップして登録
		{:else}
			ドラッグ&ドロップまたはクリックで登録
		{/if}
	</p>
</button>
