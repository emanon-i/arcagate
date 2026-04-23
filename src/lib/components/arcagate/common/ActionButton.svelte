<script lang="ts">
import type { Component } from 'svelte';

interface Props {
	icon: Component;
	label: string;
	onclick?: () => void;
	[key: string]: unknown;
}

let { icon: Icon, label, onclick, ...restProps }: Props = $props();
</script>

<button
	type="button"
	class="flex items-center justify-center gap-2 rounded-2xl border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-3 text-sm text-[var(--ag-text-secondary)] transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-surface-4)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
	{onclick}
	{...restProps}
>
	<Icon class="h-4 w-4" />
	{label}
</button>
