<script lang="ts">
import { cubicOut } from 'svelte/easing';
import { fade, scale } from 'svelte/transition';
import { Button } from '$lib/components/ui/button';

interface Props {
	open: boolean;
	title: string;
	description: string;
	confirmLabel: string;
	cancelLabel?: string;
	confirmVariant?: 'destructive' | 'default';
	onConfirm: () => void;
	onCancel: () => void;
}

let {
	open,
	title,
	description,
	confirmLabel,
	cancelLabel = 'キャンセル',
	confirmVariant = 'default',
	onConfirm,
	onCancel,
}: Props = $props();

const rm =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;
</script>

<!-- Escape / Enter: window listener で root-cause fix。modal div の onkeydown は
     trigger button から focus が移動しないため発火しない (refactor/escape-key-fix)。
     `<svelte:window>` は {#if} 外配置必須、open guard を inline 化。 -->
<svelte:window
	onkeydown={(e) => {
		if (!open) return;
		if (e.key === 'Escape') onCancel();
		if (e.key === 'Enter') onConfirm();
	}}
/>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		aria-labelledby="confirm-dialog-title"
		aria-describedby="confirm-dialog-desc"
		tabindex="-1"
		transition:fade={{ duration: dFast }}
		onclick={(e) => {
			if (e.target === e.currentTarget) onCancel();
		}}
	>
		<div
			class="w-full max-w-sm rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] p-6 shadow-[var(--ag-shadow-dialog)]"
			transition:scale={{ duration: dNormal, start: 0.96, easing: cubicOut }}
		>
			<h3
				id="confirm-dialog-title"
				class="mb-2 text-base font-semibold text-[var(--ag-text-primary)]"
			>
				{title}
			</h3>
			<p id="confirm-dialog-desc" class="mb-4 text-sm text-[var(--ag-text-secondary)]">
				{description}
			</p>
			<div class="flex justify-end gap-2">
				<Button type="button" variant="outline" size="sm" onclick={onCancel}>
					{cancelLabel}
				</Button>
				<Button
					type="button"
					variant={confirmVariant === 'destructive' ? 'destructive' : 'default'}
					size="sm"
					onclick={onConfirm}
				>
					{confirmLabel}
				</Button>
			</div>
		</div>
	</div>
{/if}
