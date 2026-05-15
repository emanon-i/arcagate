<script lang="ts">
import BaseDialog from '$lib/components/common/BaseDialog.svelte';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';

/**
 * ワークスペース名変更 dialog。BaseDialog rewrite (Dialog wrapper unify Phase 2)。
 *
 * 旧実装は modal div 上の `onkeydown={Escape}` で close していた (他 5 dialog は window listener)。
 * BaseDialog 化により window listener に統一 (focus が input にあっても Escape が確実に届く)。
 *
 * BaseDialog 担当: Escape / backdrop / fade+scale / aria role
 * 本 component 担当: form submit (Enter で onConfirm)、$effect on open で rename value reset
 */
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

<BaseDialog {open} onClose={onCancel} size="sm">
	<h3 class="mb-4 text-lg font-semibold text-[var(--ag-text-primary)]">
		{t('workspace.rename.title')}
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
			placeholder={t('workspace.rename.placeholder')}
			autofocus
		/>
		<div class="mt-4 flex justify-end gap-2">
			<Button type="button" variant="outline" size="sm" onclick={onCancel}>
				{t('common.cancel')}
			</Button>
			<Button type="submit" size="sm">
				{t('common.change')}
			</Button>
		</div>
	</form>
</BaseDialog>
