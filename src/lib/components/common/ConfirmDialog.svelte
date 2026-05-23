<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';
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
 *
 * PH-CF-300 (2026-05-23 確定): 破壊的操作の確認パターン統一。
 * - `extraNote` で削除対象の数や連鎖削除内容を文言で明示できる (例: 「{n} 個の item を含むページを削除」)
 * - `checkboxLabel` + `bind:checkboxChecked` で破壊的なオプトイン (例: 「アイテムも消す」) を出せる
 * - 既存 caller は新 prop を省略すれば従来通り動く (後方互換)
 */
interface Props {
	open: boolean;
	title: string;
	description: string;
	confirmLabel: string;
	cancelLabel?: string;
	confirmVariant?: 'destructive' | 'default';
	/**
	 * 削除対象の影響範囲 (item 数 / 連鎖削除の有無 等) を補足表示する 1〜数行のテキスト。
	 * description より小さい字、 muted 色で出す。
	 */
	extraNote?: string;
	/** Optional checkbox label。 設定されると description の下にチェックボックスを表示する。 */
	checkboxLabel?: string;
	/** チェックボックス状態 (caller が bind:checkboxChecked で双方向) */
	checkboxChecked?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

// audit 2026-05-14 i18n Phase 3 common: default cancelLabel を t('common.cancel') 経由化、
// caller が個別 label 指定すれば override、 default は locale 連動。
let {
	open,
	title,
	description,
	confirmLabel,
	cancelLabel,
	confirmVariant = 'default',
	extraNote,
	checkboxLabel,
	checkboxChecked = $bindable(false),
	onConfirm,
	onCancel,
}: Props = $props();
let resolvedCancelLabel = $derived(cancelLabel ?? t('common.cancel'));
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
	{#if extraNote}
		<!-- 削除対象の影響範囲を強調 (PH-CF-300: 影響範囲の文言提示)。 -->
		<p class="mb-4 text-xs text-[var(--ag-text-muted)]" data-testid="confirm-dialog-extra-note">
			{extraNote}
		</p>
	{/if}
	{#if checkboxLabel}
		<label
			class="mb-4 flex cursor-pointer items-start gap-2 text-sm text-[var(--ag-text-secondary)]"
		>
			<input
				type="checkbox"
				class="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--ag-accent-text)]"
				data-testid="confirm-dialog-checkbox"
				bind:checked={checkboxChecked}
			/>
			<span>{checkboxLabel}</span>
		</label>
	{/if}
	<div class="flex justify-end gap-2">
		<Button type="button" variant="outline" size="sm" onclick={onCancel}>
			{resolvedCancelLabel}
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
