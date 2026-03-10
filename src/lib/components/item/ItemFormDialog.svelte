<script lang="ts">
import type { CreateItemInput, Item, UpdateItemInput } from '$lib/types/item';
import type { Tag } from '$lib/types/tag';
import ItemForm from './ItemForm.svelte';

let {
	open,
	item,
	initialPaths,
	tags,
	onSubmit,
	onClose,
}: {
	open: boolean;
	item?: Item;
	initialPaths?: string[];
	tags: Tag[];
	onSubmit: (input: CreateItemInput | UpdateItemInput) => void;
	onClose: () => void;
} = $props();

function handleSubmit(input: CreateItemInput | UpdateItemInput) {
	onSubmit(input);
	onClose();
}
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    role="dialog"
    aria-modal="true"
  >
    <div class="w-full max-w-lg rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] p-6 shadow-[var(--ag-shadow-dialog)]">
      <h2 class="mb-4 text-lg font-semibold text-[var(--ag-text-primary)]">{item ? "アイテムを編集" : "アイテムを追加"}</h2>
      <ItemForm {item} {initialPaths} {tags} onSubmit={handleSubmit} onCancel={onClose} />
    </div>
  </div>
{/if}
