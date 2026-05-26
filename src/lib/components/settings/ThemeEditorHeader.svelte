<script lang="ts">
import { Check, Pencil, Trash2 } from '@lucide/svelte';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';

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
				aria-label={t('settings.appearance.theme_name_aria')}
				onblur={() => onCommitNameEdit()}
				onkeydown={handleNameKeydown}
				class="rounded border border-[var(--ag-accent)] bg-[var(--ag-surface-2)] px-2 py-0.5 text-sm font-semibold text-[var(--ag-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ag-accent)]"
			/>
		{:else}
			<button
				type="button"
				title={t('settings.appearance.theme_name_edit_hint')}
				onclick={onStartNameEdit}
				class="flex items-center gap-1.5 rounded px-1 py-0.5 text-sm font-semibold text-[var(--ag-text-primary)] hover:bg-[var(--ag-surface-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ag-accent)]"
			>
				{t('settings.appearance.edit_theme_button', { name: themeName })}
				<Pencil class="h-3 w-3 opacity-50" />
			</button>
		{/if}
		{#if isDirty}
			<span class="rounded px-1.5 py-0.5 text-xs font-medium text-[var(--ag-warm-text)]">
				● {t('settings.appearance.unsaved')}
			</span>
		{/if}
	</div>
	<div class="flex items-center gap-2">
		{#if savedSuccess}
			<span class="text-xs text-[var(--ag-success-text)]">✓ {t('toast.saved')}</span>
		{/if}
		{#if !isBuiltin}
			<Button
				type="button"
				variant="ghost"
				size="sm"
				class="text-[var(--ag-error-text)] hover:bg-[var(--ag-error-bg)]"
				onclick={onDelete}
			>
				<Trash2 class="h-3.5 w-3.5" />
				{confirmDelete ? t('settings.appearance.delete_confirm_button') : t('common.delete')}
			</Button>
		{/if}
		<Button
			type="button"
			size="sm"
			disabled={saving || !isDirty}
			onclick={onSave}
			data-testid="theme-editor-save"
		>
			<Check class="h-3.5 w-3.5" />
			{saving ? t('settings.appearance.saving') : t('common.save')}
		</Button>
	</div>
</div>
