<script lang="ts">
import type { Snippet } from 'svelte';

type Tone = 'default' | 'accent' | 'warm' | 'success';

interface Props {
	tone?: Tone;
	children: Snippet;
	onclick?: () => void;
	[key: string]: unknown;
}

const toneClasses: Record<Tone, string> = {
	default: 'border-[var(--ag-border)] bg-[var(--ag-surface-4)] text-[var(--ag-text-secondary)]',
	accent: 'border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] text-[var(--ag-accent-text)]',
	warm: 'border-[var(--ag-warm-border)] bg-[var(--ag-warm-bg)] text-[var(--ag-warm-text)]',
	success:
		'border-[var(--ag-success-border)] bg-[var(--ag-success-bg)] text-[var(--ag-success-text)]',
};

let { tone = 'default', children, onclick, ...restProps }: Props = $props();
</script>

{#if onclick}
	<button
		type="button"
		class="rounded-full border px-2.5 py-1 text-[11px] transition {toneClasses[tone]}"
		{onclick}
		{...restProps}
	>
		{@render children()}
	</button>
{:else}
	<span class="rounded-full border px-2.5 py-1 text-[11px] {toneClasses[tone]}" {...restProps}>
		{@render children()}
	</span>
{/if}
