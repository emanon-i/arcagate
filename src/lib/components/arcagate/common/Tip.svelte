<script lang="ts">
import { Info, X } from '@lucide/svelte';
import type { Snippet } from 'svelte';
import { onMount } from 'svelte';

type TipTone = 'default' | 'accent' | 'success';

interface Props {
	tone?: TipTone;
	tipId: string;
	children: Snippet;
}

const toneClasses: Record<TipTone, string> = {
	default: 'border-[var(--ag-border)] bg-[var(--ag-surface-2)] text-[var(--ag-text-secondary)]',
	accent: 'border-cyan-400/15 bg-cyan-400/8 text-cyan-50/90',
	success: 'border-emerald-400/18 bg-emerald-400/8 text-emerald-50/90',
};

let { tone = 'default', tipId, children }: Props = $props();

let visible = $state(true);

onMount(() => {
	if (localStorage.getItem(`tip-dismissed-${tipId}`)) {
		visible = false;
	}
});

function dismiss() {
	visible = false;
	localStorage.setItem(`tip-dismissed-${tipId}`, '1');
}
</script>

{#if visible}
	<div data-tip-id={tipId} class="relative rounded-[var(--ag-radius-card)] border px-4 py-3 text-sm {toneClasses[tone]}">
		<div class="flex items-start gap-3">
			<div class="mt-0.5 rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface-3)] p-1.5">
				<Info class="h-4 w-4" />
			</div>
			<div class="min-w-0 flex-1 leading-6">
				{@render children()}
			</div>
			<button
				type="button"
				aria-label="閉じる"
				class="rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface-3)] p-1.5 text-[var(--ag-text-secondary)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-surface-4)]"
				onclick={dismiss}
			>
				<X class="h-4 w-4" />
			</button>
		</div>
	</div>
{/if}
