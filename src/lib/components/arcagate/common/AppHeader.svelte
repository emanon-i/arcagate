<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
	leftSlot?: Snippet;
	centerSlot?: Snippet;
	rightSlot?: Snippet;
}

let { leftSlot, centerSlot, rightSlot }: Props = $props();
</script>

<header class="flex h-10 shrink-0 items-center justify-between border-b border-[var(--ag-border)] bg-[var(--ag-surface-4)] px-4">
	<div class="flex flex-1 items-center gap-1.5">
		{#if leftSlot}
			{@render leftSlot()}
		{/if}
	</div>
	<div class="justify-self-center">
		{#if centerSlot}
			{@render centerSlot()}
		{/if}
	</div>
	<div class="flex flex-1 items-center gap-1.5 justify-self-end justify-end">
		{#if rightSlot}
			{@render rightSlot()}
		{/if}
	</div>
</header>
