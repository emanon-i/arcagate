<script lang="ts">
import type { Component } from 'svelte';

type Tone = 'default' | 'accent' | 'warm';

interface Props {
	icon: Component;
	label: string;
	tone?: Tone;
	onclick?: () => void;
}

const toneClasses: Record<Tone, string> = {
	default:
		'border-[var(--ag-border)] bg-[var(--ag-surface-2)] text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-3)]',
	accent: 'border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] text-[var(--ag-accent-text)]',
	warm: 'border-[var(--ag-warm-border)] bg-[var(--ag-warm-bg)] text-[var(--ag-warm-text)]',
};

let { icon: Icon, label, tone = 'default', onclick }: Props = $props();
</script>

<button
	type="button"
	class="flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs transition {toneClasses[tone]}"
	{onclick}
>
	<Icon class="h-4 w-4" />
	<span>{label}</span>
</button>
