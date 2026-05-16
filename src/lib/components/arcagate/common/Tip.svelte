<script lang="ts">
import { Info, X } from '@lucide/svelte';
import type { Snippet } from 'svelte';
import { onMount } from 'svelte';
import { t } from '$lib/i18n.svelte';

type TipTone = 'default' | 'accent' | 'success';

interface Props {
	tone?: TipTone;
	tipId: string;
	children: Snippet;
}

const toneClasses: Record<TipTone, string> = {
	default: 'border-[var(--ag-border)] bg-[var(--ag-surface-2)] text-[var(--ag-text-secondary)]',
	accent: 'border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] text-[var(--ag-accent-text)]',
	success:
		'border-[var(--ag-success-border)] bg-[var(--ag-success-bg)] text-[var(--ag-success-text)]',
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
				aria-label={t('common.close')}
				class="rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface-3)] p-1.5 text-[var(--ag-text-secondary)] transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)]"
				onclick={dismiss}
			>
				<X class="h-4 w-4" />
			</button>
		</div>
	</div>
{/if}
