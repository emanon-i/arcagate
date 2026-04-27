<script lang="ts">
import { Copy, Minus, Square, X } from '@lucide/svelte';
import type { Window } from '@tauri-apps/api/window';
import { onDestroy, onMount, type Snippet } from 'svelte';

interface Props {
	leftSlot?: Snippet;
	centerSlot?: Snippet;
}

let { leftSlot, centerSlot }: Props = $props();

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
<!-- NO_OVERFLOW_AUDIT_OK: flex-1 spacers (L57, L63) are empty drag regions with no text, no overflow risk -->
<header
	class="flex h-10 shrink-0 items-center justify-between border-b border-[var(--ag-border)] bg-[var(--ag-surface-4)] px-2"
	data-tauri-drag-region
	ondblclick={handleToggleMaximize}
>
	<!-- Left: action buttons -->
	<div class="flex items-center gap-1.5">
		{#if leftSlot}
			{@render leftSlot()}
		{/if}
	</div>

	<!-- Center: tabs (drag region fills gaps) -->
	<div class="flex-1" data-tauri-drag-region></div>
	<div class="justify-self-center">
		{#if centerSlot}
			{@render centerSlot()}
		{/if}
	</div>
	<div class="flex-1" data-tauri-drag-region></div>

	<!-- Right: window controls -->
	<div class="flex">
		<button
			type="button"
			class="inline-flex h-10 w-10 items-center justify-center text-[var(--ag-text-secondary)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)]"
			aria-label="最小化"
			onclick={handleMinimize}
		>
			<Minus class="h-4 w-4" />
		</button>
		<button
			type="button"
			class="inline-flex h-10 w-10 items-center justify-center text-[var(--ag-text-secondary)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)]"
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
			class="inline-flex h-10 w-10 items-center justify-center text-[var(--ag-text-secondary)] transition-[color,background-color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-red-500/80 hover:text-white"
			aria-label="閉じる"
			onclick={handleClose}
		>
			<X class="h-4 w-4" />
		</button>
	</div>
</header>
