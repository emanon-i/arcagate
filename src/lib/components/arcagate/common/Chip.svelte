<script lang="ts">
import type { Snippet } from 'svelte';

type Tone = 'default' | 'accent' | 'warm' | 'success';

type Size = 'sm' | 'md';

interface Props {
	tone?: Tone;
	size?: Size;
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

const sizeClasses: Record<Size, string> = {
	sm: 'px-2.5 py-1 text-[11px]',
	md: 'px-3.5 py-1.5 text-xs',
};

let { tone = 'default', size = 'sm', children, onclick, ...restProps }: Props = $props();
</script>

{#if onclick}
	<button
		type="button"
		class="rounded-full border transition-[color,background-color,border-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {sizeClasses[size]} {toneClasses[tone]}"
		{onclick}
		{...restProps}
	>
		{@render children()}
	</button>
{:else}
	<span class="rounded-full border {sizeClasses[size]} {toneClasses[tone]}" {...restProps}>
		{@render children()}
	</span>
{/if}
