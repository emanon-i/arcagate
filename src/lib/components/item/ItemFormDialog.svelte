<script lang="ts">
import { cubicOut } from 'svelte/easing';
import { fade, scale } from 'svelte/transition';
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
		submitError = String(e);
	} finally {
		submitting = false;
	}
}

function handleBackdropClick(e: MouseEvent) {
	if (e.target === e.currentTarget) {
		onClose();
	}
}

function handleKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape') {
		onClose();
	}
}

const rm =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;
</script>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		transition:fade={{ duration: dFast }}
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
	>
		<div
			class="w-full max-w-lg rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] p-6 shadow-[var(--ag-shadow-dialog)]"
			transition:scale={{ duration: dNormal, start: 0.96, easing: cubicOut }}
		>
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
			<ItemForm {item} {initialPaths} {tags} onSubmit={handleSubmit} onCancel={onClose} {submitting} />
		</div>
	</div>
{/if}
