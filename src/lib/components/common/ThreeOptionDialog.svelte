<script lang="ts">
import { Button } from '$lib/components/ui/button';
import BaseDialog from './BaseDialog.svelte';

/**
 * Fix B (2026-05-12): 3 択 confirm dialog。 Tauri-plugin-dialog の ask() は Yes/No 2 択のみで
 * 「focus 既存 / 別 widget として追加 / キャンセル」 の 3 択 UX に対応できないため新規実装。
 *
 * default focus は primary button (= 推奨選択)。 Escape / backdrop click は cancel。
 */
interface Props {
	open: boolean;
	title: string;
	message: string;
	/** primary button (推奨選択、default focus)。 */
	primaryLabel: string;
	onPrimary: () => void;
	/** secondary button (代替)。 */
	secondaryLabel: string;
	onSecondary: () => void;
	/** cancel button (= onClose)。 */
	cancelLabel?: string;
	onClose: () => void;
}

let {
	open,
	title,
	message,
	primaryLabel,
	onPrimary,
	secondaryLabel,
	onSecondary,
	cancelLabel = 'キャンセル',
	onClose,
}: Props = $props();
</script>

<BaseDialog {open} {onClose} size="md">
	<h2 class="mb-2 text-base font-semibold text-[var(--ag-text-primary)]">{title}</h2>
	<p class="mb-4 whitespace-pre-wrap text-sm text-[var(--ag-text-secondary)]">{message}</p>
	<div class="flex justify-end gap-2">
		<Button type="button" variant="outline" onclick={onClose}>{cancelLabel}</Button>
		<Button type="button" variant="outline" onclick={onSecondary}>{secondaryLabel}</Button>
		<Button type="button" variant="default" onclick={onPrimary} autofocus>{primaryLabel}</Button>
	</div>
</BaseDialog>
