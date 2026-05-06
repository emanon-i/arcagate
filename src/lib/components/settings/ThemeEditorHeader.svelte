<script lang="ts">
import { Check, Pencil, Trash2 } from '@lucide/svelte';

/**
 * ThemeEditor のヘッダー (theme info preview + name edit + save / delete buttons + status)。
 *
 * 引用元 guideline:
 *   docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、preview/header 抽出)
 *
 * agent judgment: a3 元提案の "ThemeEditorPreview" は実装に対応する visual preview UI が
 * ないため、theme info + edit controls を「header / preview 統合」として本 component に集約。
 */
interface Props {
	themeName: string;
	isBuiltin: boolean;
	isDirty: boolean;
	saving: boolean;
	savedSuccess: boolean;
	confirmDelete: boolean;
	editingName: boolean;
	nameValue: string;
	onStartNameEdit: () => void;
	onCommitNameEdit: () => void;
	onCancelNameEdit: () => void;
	onSave: () => void;
	onDelete: () => void;
}

let {
	themeName,
	isBuiltin,
	isDirty,
	saving,
	savedSuccess,
	confirmDelete,
	editingName,
	nameValue = $bindable(''),
	onStartNameEdit,
	onCommitNameEdit,
	onCancelNameEdit,
	onSave,
	onDelete,
}: Props = $props();

function handleNameKeydown(e: KeyboardEvent) {
	if (e.key === 'Enter') {
		e.preventDefault();
		onCommitNameEdit();
	} else if (e.key === 'Escape') {
		onCancelNameEdit();
	}
}
</script>

<div class="mb-3 flex items-center justify-between">
	<div class="flex items-center gap-2">
		{#if editingName}
			<input
				type="text"
				bind:value={nameValue}
				aria-label="テーマ名"
				onblur={() => onCommitNameEdit()}
				onkeydown={handleNameKeydown}
				class="rounded border border-[var(--ag-accent)] bg-[var(--ag-surface-2)] px-2 py-0.5 text-sm font-semibold text-[var(--ag-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ag-accent)]"
			/>
		{:else}
			<button
				type="button"
				title="クリックして名前を変更"
				onclick={onStartNameEdit}
				class="flex items-center gap-1.5 rounded px-1 py-0.5 text-sm font-semibold text-[var(--ag-text-primary)] hover:bg-[var(--ag-surface-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ag-accent)]"
			>
				{themeName} を編集
				<Pencil class="h-3 w-3 opacity-50" />
			</button>
		{/if}
		{#if isDirty}
			<span class="rounded px-1.5 py-0.5 text-xs font-medium text-[var(--ag-warm-text)]">
				● 未保存
			</span>
		{/if}
	</div>
	<div class="flex items-center gap-2">
		{#if savedSuccess}
			<span class="text-xs text-[var(--ag-success-text)]">✓ 保存しました</span>
		{/if}
		{#if !isBuiltin}
			<button
				type="button"
				class="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--ag-error-text)] transition-colors hover:bg-[var(--ag-error-bg)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ag-accent)]"
				onclick={onDelete}
			>
				<Trash2 class="h-3.5 w-3.5" />
				{confirmDelete ? '本当に削除' : '削除'}
			</button>
		{/if}
		<button
			type="button"
			disabled={saving || !isDirty}
			class="flex items-center gap-1.5 rounded-md bg-[var(--ag-accent-bg)] px-3 py-1.5 text-xs font-medium text-[var(--ag-accent-text)] transition-colors hover:bg-[var(--ag-accent-active-bg)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ag-accent)]"
			onclick={onSave}
		>
			<Check class="h-3.5 w-3.5" />
			{saving ? '保存中…' : '保存'}
		</button>
	</div>
</div>
