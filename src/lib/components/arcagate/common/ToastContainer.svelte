<script lang="ts">
import { X } from '@lucide/svelte';
import { fade, fly } from 'svelte/transition';
import { toastStore } from '$lib/state/toast.svelte';

const rm =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;

const typeStyles: Record<string, string> = {
	success:
		'border-[var(--ag-success-border)] bg-[var(--ag-success-bg)] text-[var(--ag-success-text)]',
	error: 'border-destructive/50 bg-destructive/10 text-destructive',
	info: 'border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] text-[var(--ag-accent-text)]',
};
</script>

{#if toastStore.toasts.length > 0}
	<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2" data-testid="toast-container">
		{#each toastStore.toasts as toast (toast.id)}
			<div
				class="flex max-w-sm items-center gap-2 rounded-md border px-4 py-3 text-sm shadow-md {typeStyles[
					toast.type
				]}"
				data-testid="toast-{toast.type}"
				in:fly={{ x: 100, duration: dNormal }}
				out:fade={{ duration: dFast }}
			>
				<span class="flex-1">{toast.message}</span>
				<button
					type="button"
					class="shrink-0 opacity-60 transition-opacity duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:opacity-100"
					aria-label="閉じる"
					onclick={() => toastStore.dismiss(toast.id)}
				>
					<X class="h-3.5 w-3.5" />
				</button>
			</div>
		{/each}
	</div>
{/if}
