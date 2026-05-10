<script lang="ts">
import { Button } from '$lib/components/ui/button';
import BaseDialog from './BaseDialog.svelte';

/**
 * ConfirmDialog: title + description + cancel/confirm の小型確認 dialog。
 *
 * BaseDialog を使う rewrite (refactor: Dialog wrapper unify)。
 * - BaseDialog 担当: Escape close / backdrop / fade+scale / aria role
 * - 本 component 担当: Enter → onConfirm の追加 keyboard handler、layout
 *
 * Enter handler は BaseDialog の Escape window listener と独立した別 window listener
 * (anti-pattern §3 回避: BaseDialog に「全 keyboard event の bubbling」 等 leaky API
 * を追加せず、caller が必要な key を個別 handle)。
 */
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
</script>

<!-- Enter → onConfirm: BaseDialog 内の Escape listener とは独立した別 window listener。 -->
<svelte:window
	onkeydown={(e) => {
		if (open && e.key === 'Enter') onConfirm();
	}}
/>

<BaseDialog
	{open}
	onClose={onCancel}
	ariaLabelledby="confirm-dialog-title"
	ariaDescribedby="confirm-dialog-desc"
	size="sm"
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
</BaseDialog>
