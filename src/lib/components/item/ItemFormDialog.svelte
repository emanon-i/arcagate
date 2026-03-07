<script lang="ts">
import type { Category } from '$lib/types/category';
import type { CreateItemInput, Item, UpdateItemInput } from '$lib/types/item';
import type { Tag } from '$lib/types/tag';
import ItemForm from './ItemForm.svelte';

let {
	open,
	item,
	initialPaths,
	categories,
	tags,
	onSubmit,
	onClose,
}: {
	open: boolean;
	item?: Item;
	initialPaths?: string[];
	categories: Category[];
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
    <div class="bg-background w-full max-w-lg rounded-lg p-6 shadow-lg">
      <h2 class="mb-4 text-lg font-semibold">{item ? "アイテムを編集" : "アイテムを追加"}</h2>
      <ItemForm {item} {initialPaths} {categories} {tags} onSubmit={handleSubmit} onCancel={onClose} />
    </div>
  </div>
{/if}
