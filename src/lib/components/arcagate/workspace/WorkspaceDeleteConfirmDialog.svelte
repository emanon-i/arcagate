<script lang="ts">
import { cubicOut } from 'svelte/easing';
import { fade, scale } from 'svelte/transition';

interface Props {
	widgetId: string | null;
	onConfirm: () => void;
	onCancel: () => void;
}

let { widgetId, onConfirm, onCancel }: Props = $props();

const rm =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;
</script>

{#if widgetId}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		transition:fade={{ duration: dFast }}
		onclick={(e) => {
			if (e.target === e.currentTarget) onCancel();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') onCancel();
		}}
	>
		<div
			class="w-full max-w-sm rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] p-6 shadow-[var(--ag-shadow-dialog)]"
			transition:scale={{ duration: dNormal, start: 0.96, easing: cubicOut }}
		>
			<h3 class="mb-2 text-base font-semibold text-[var(--ag-text-primary)]">
				ウィジェットを削除しますか？
			</h3>
			<p class="mb-5 text-sm text-[var(--ag-text-muted)]">この操作は元に戻せません。</p>
			<div class="flex justify-end gap-2">
				<button
					type="button"
					class="rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-4 py-2 text-sm text-[var(--ag-text-secondary)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-surface-4)]"
					onclick={onCancel}
				>
					キャンセル
				</button>
				<button
					type="button"
					class="rounded-lg bg-destructive px-4 py-2 text-sm text-white transition-[background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] hover:opacity-90"
					onclick={onConfirm}
				>
					削除
				</button>
			</div>
		</div>
	</div>
{/if}
