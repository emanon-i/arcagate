<script lang="ts">
import { Eye, EyeOff } from '@lucide/svelte';
import { hiddenStore } from '$lib/state/hidden.svelte';
</script>

<button
	type="button"
	class="flex w-full items-center gap-2 rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2.5 text-sm text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-3)] transition-colors"
	onclick={() => hiddenStore.toggleDirect()}
>
	{#if hiddenStore.isHiddenVisible}
		<Eye class="h-4 w-4" />
		<span>プライベート ON</span>
	{:else}
		<EyeOff class="h-4 w-4" />
		<span>プライベート OFF</span>
	{/if}
</button>
