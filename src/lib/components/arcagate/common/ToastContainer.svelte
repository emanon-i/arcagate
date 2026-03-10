<script lang="ts">
import { X } from '@lucide/svelte';
import { toastStore } from '$lib/state/toast.svelte';

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
			>
				<span class="flex-1">{toast.message}</span>
				<button
					type="button"
					class="shrink-0 opacity-60 hover:opacity-100"
					aria-label="閉じる"
					onclick={() => toastStore.dismiss(toast.id)}
				>
					<X class="h-3.5 w-3.5" />
				</button>
			</div>
		{/each}
	</div>
{/if}
