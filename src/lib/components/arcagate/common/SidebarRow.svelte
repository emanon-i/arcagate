<script lang="ts">
import type { Component } from 'svelte';

interface Props {
	icon: Component;
	label: string;
	meta?: string;
	active?: boolean;
	onclick?: () => void;
}

let { icon: Icon, label, meta, active = false, onclick }: Props = $props();
</script>

<button
	type="button"
	class="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm {active
		? 'bg-[var(--ag-accent-active-bg)] text-[var(--ag-text-primary)] ring-1 ring-[var(--ag-accent-active-border)]'
		: 'text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]'}"
	{onclick}
>
	<div class="flex items-center gap-2.5">
		<Icon class="h-4 w-4" />
		<span>{label}</span>
	</div>
	{#if meta}
		<span class="text-xs text-[var(--ag-text-faint)]">{meta}</span>
	{/if}
</button>
