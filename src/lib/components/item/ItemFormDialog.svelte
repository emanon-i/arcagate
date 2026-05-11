<script lang="ts">
import BaseDialog from '$lib/components/common/BaseDialog.svelte';
import type { CreateItemInput, Item, UpdateItemInput } from '$lib/types/item';
import type { Tag } from '$lib/types/tag';
import { getErrorMessage } from '$lib/utils/format-error';
import ItemForm from './ItemForm.svelte';

/**
 * Item の作成 / 編集 dialog。BaseDialog rewrite (Dialog wrapper unify Phase 2)。
 *
 * BaseDialog 担当: Escape close / backdrop / fade+scale / aria role
 * 本 component 担当: form submit handling + error state slot + ItemForm 描画
 */
let {
	open,
	item,
	initialPaths,
	initialUrl,
	tags,
	onSubmit,
	onClose,
}: {
	open: boolean;
	item?: Item;
	initialPaths?: string[];
	/** U-1: URL D&D の prefill (target に URL、 label に title 自動取得)。 */
	initialUrl?: string;
	tags: Tag[];
	onSubmit: (input: CreateItemInput | UpdateItemInput) => Promise<void>;
	onClose: () => void;
} = $props();

let submitting = $state(false);
let submitError = $state<string | null>(null);

async function handleSubmit(input: CreateItemInput | UpdateItemInput) {
	submitting = true;
	submitError = null;
	try {
		await onSubmit(input);
		onClose();
	} catch (e) {
		submitError = getErrorMessage(e);
	} finally {
		submitting = false;
	}
}
</script>

<BaseDialog {open} {onClose} size="lg">
	<h2 class="mb-4 text-lg font-semibold text-[var(--ag-text-primary)]">
		{item ? 'アイテムを編集' : 'アイテムを追加'}
	</h2>
	{#if submitError}
		<div
			class="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
		>
			{submitError}
		</div>
	{/if}
	<ItemForm
		{item}
		{initialPaths}
		{initialUrl}
		{tags}
		onSubmit={handleSubmit}
		onCancel={onClose}
		{submitting}
	/>
</BaseDialog>
