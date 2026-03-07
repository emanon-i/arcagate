<script lang="ts">
import { Plus } from '@lucide/svelte';
import { listen } from '@tauri-apps/api/event';
import { onDestroy } from 'svelte';

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
</script>

<div
	class="rounded-[var(--ag-radius-widget)] border border-dashed p-4 transition-colors {isDragging
		? 'border-[var(--ag-accent)] bg-[var(--ag-accent)]/10'
		: 'border-[var(--ag-border-dashed)] bg-[var(--ag-surface-2)]'}"
>
	<div class="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--ag-text-primary)]">
		<Plus class="h-4 w-4" />
		クイック登録
	</div>
	<p class="text-xs leading-5 text-[var(--ag-text-muted)]">
		{#if isDragging}
			ここにドロップして登録
		{:else}
			exe / url / folder / ps1 をドラッグ&ドロップで登録。アイコン取得・初期カテゴリ推定・別名候補を自動入力。
		{/if}
	</p>
</div>
