<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
	title: string;
	subtitle?: string;
	centerSlot?: Snippet;
	rightSlot?: Snippet;
}

let { title, subtitle, centerSlot, rightSlot }: Props = $props();
</script>

<header class="grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-[var(--ag-border)] bg-[var(--ag-surface-4)] px-5">
	<div class="min-w-0 truncate text-sm font-semibold text-[var(--ag-text-primary)]">
		{title}
		{#if subtitle}
			<span class="ml-2 text-xs font-normal text-[var(--ag-text-faint)]">&mdash; {subtitle}</span>
		{/if}
	</div>
	<div class="justify-self-center">
		{#if centerSlot}
			{@render centerSlot()}
		{/if}
	</div>
	<div class="flex items-center gap-2 justify-self-end">
		{#if rightSlot}
			{@render rightSlot()}
		{/if}
	</div>
</header>
