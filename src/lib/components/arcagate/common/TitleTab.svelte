<script lang="ts">
import type { Component } from 'svelte';

interface Props {
	icon: Component;
	label: string;
	active?: boolean;
	onclick?: () => void;
}

let { icon: Icon, label, active = false, onclick }: Props = $props();
</script>

<button
	type="button"
	class="flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-xs transition {active
		? 'border-[var(--ag-accent-active-border)] bg-[var(--ag-accent-active-bg)] text-[var(--ag-text-primary)]'
		: 'border-[var(--ag-border)] bg-[var(--ag-surface-2)] text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-3)]'}"
	{onclick}
>
	<Icon class="h-4 w-4" />
	<span>{label}</span>
</button>
