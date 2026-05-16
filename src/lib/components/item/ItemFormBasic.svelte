<script lang="ts">
import { t } from '$lib/i18n.svelte';

/**
 * ItemForm の識別フィールド (label / aliases)。
 *
 * G-6 (2026-05-09 user 検収): icon 編集 UI は ItemFormCardOverride (カード個別設定) に移植。
 * 「アイコンはアイテム本体属性ではなくカードの見た目に属する」 user 整理。E-3 / F-5 で
 * 確立した「カード見た目は detail panel の checkbox + 別 modal で編集」 line に合流。
 *
 * 引用元 guideline:
 *   docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、basic 抽出)
 */
interface Props {
	label: string;
	aliasesText: string;
}

let { label = $bindable(''), aliasesText = $bindable('') }: Props = $props();
</script>

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="item-label"
		>{t('item.form.label_field')} <span class="text-destructive">*</span></label
	>
	<!-- svelte-ignore a11y_autofocus -->
	<input
		id="item-label"
		type="text"
		autocomplete="off"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)] placeholder:text-[var(--ag-text-muted)]"
		bind:value={label}
		required
		autofocus
		placeholder={t('item.form.label_placeholder')}
	/>
</div>

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="item-aliases"
		>{t('item.form.aliases_field')}</label
	>
	<input
		id="item-aliases"
		type="text"
		autocomplete="off"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)] placeholder:text-[var(--ag-text-muted)]"
		bind:value={aliasesText}
		placeholder="alias1, alias2"
	/>
</div>
