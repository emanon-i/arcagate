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
	class="flex items-center justify-center gap-2 rounded-2xl border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-3 text-sm text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]"
	{onclick}
	{...restProps}
>
	<Icon class="h-4 w-4" />
	{label}
</button>
