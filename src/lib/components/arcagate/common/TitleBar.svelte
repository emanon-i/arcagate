<script lang="ts">
import { Copy, Minus, Square, X } from '@lucide/svelte';
import type { Window } from '@tauri-apps/api/window';
import { onDestroy, onMount } from 'svelte';

let appWindow: Window | null = null;
let isMaximized = $state(false);
let unlisten: (() => void) | null = null;

onMount(async () => {
	const { getCurrentWindow } = await import('@tauri-apps/api/window');
	appWindow = getCurrentWindow();
	isMaximized = await appWindow.isMaximized();
	unlisten = await appWindow.onResized(async () => {
		isMaximized = (await appWindow?.isMaximized()) ?? false;
	});
});

onDestroy(() => {
	unlisten?.();
});

function handleMinimize() {
	void appWindow?.minimize();
}

function handleToggleMaximize() {
	void appWindow?.toggleMaximize();
}

function handleClose() {
	void appWindow?.close();
}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="flex h-7 shrink-0 items-center justify-between bg-[var(--ag-surface-4)]"
	data-tauri-drag-region
	ondblclick={handleToggleMaximize}
>
	<span
		class="pointer-events-none select-none pl-3 text-xs font-medium text-[var(--ag-text-secondary)]"
		data-tauri-drag-region
	>
		Arcagate
	</span>
	<div class="flex">
		<button
			type="button"
			class="inline-flex h-7 w-10 items-center justify-center text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-3)]"
			aria-label="最小化"
			onclick={handleMinimize}
		>
			<Minus class="h-4 w-4" />
		</button>
		<button
			type="button"
			class="inline-flex h-7 w-10 items-center justify-center text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-3)]"
			aria-label={isMaximized ? '元に戻す' : '最大化'}
			onclick={handleToggleMaximize}
		>
			{#if isMaximized}
				<Copy class="h-3.5 w-3.5" />
			{:else}
				<Square class="h-3.5 w-3.5" />
			{/if}
		</button>
		<button
			type="button"
			class="inline-flex h-7 w-10 items-center justify-center text-[var(--ag-text-secondary)] hover:bg-red-500/80 hover:text-white"
			aria-label="閉じる"
			onclick={handleClose}
		>
			<X class="h-4 w-4" />
		</button>
	</div>
</div>
