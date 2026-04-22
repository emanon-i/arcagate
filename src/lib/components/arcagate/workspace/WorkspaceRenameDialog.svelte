<script lang="ts">
interface Props {
	open: boolean;
	currentName: string;
	onConfirm: (name: string) => void;
	onCancel: () => void;
}

let { open, currentName, onConfirm, onCancel }: Props = $props();

let renameValue = $state('');

$effect(() => {
	if (open) renameValue = currentName;
});
</script>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) onCancel();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') onCancel();
		}}
	>
		<div
			class="w-full max-w-sm rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] p-6 shadow-[var(--ag-shadow-dialog)]"
		>
			<h3 class="mb-4 text-lg font-semibold text-[var(--ag-text-primary)]">
				ワークスペース名を変更
			</h3>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					onConfirm(renameValue);
				}}
			>
				<!-- svelte-ignore a11y_autofocus -->
				<input
					type="text"
					class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)] placeholder:text-[var(--ag-text-muted)]"
					bind:value={renameValue}
					placeholder="ワークスペース名"
					autofocus
				/>
				<div class="mt-4 flex justify-end gap-2">
					<button
						type="button"
						class="rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-4 py-2 text-sm text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]"
						onclick={onCancel}
					>
						キャンセル
					</button>
					<button
						type="submit"
						class="rounded-lg bg-[var(--ag-accent)] px-4 py-2 text-sm text-white hover:opacity-90"
					>
						変更
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
