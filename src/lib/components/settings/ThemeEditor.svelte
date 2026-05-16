<script lang="ts">
import { t } from '$lib/i18n.svelte';
import { themeStore } from '$lib/state/theme.svelte';
import type { Theme } from '$lib/types/theme';
import ThemeEditorHeader from './ThemeEditorHeader.svelte';
import ThemeEditorTokenEditor from './ThemeEditorTokenEditor.svelte';

/**
 * ThemeEditor facade。
 *
 * 引用元 guideline:
 *   docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、332 LOC を facade + 2 sub に分割)
 *
 * 子 component:
 * - ThemeEditorHeader (theme info + name edit + save/delete buttons + status)
 * - ThemeEditorTokenEditor (grouped vars editor + color picker + text input)
 *
 * agent judgment: a3 元提案 (Preview / CategoryList / TokenEditor 3 子) は実装に対応する
 * visual preview / sidebar category list が無く、Header + TokenEditor の 2 子に再構成。
 */

let { theme, onClose }: { theme: Theme; onClose: () => void } = $props();

type VarEntry = { key: string; value: string };

// 全標準 --ag-* 変数リスト（arcagate-theme.css の :root 変数に対応）
const ALL_AG_VARS: string[] = [
	// bg
	'--ag-bg',
	// surface
	'--ag-surface-page',
	'--ag-surface-0',
	'--ag-surface-1',
	'--ag-surface-2',
	'--ag-surface-3',
	'--ag-surface-4',
	'--ag-surface-opaque',
	// border
	'--ag-border',
	'--ag-border-hover',
	'--ag-border-dashed',
	// accent
	'--ag-accent',
	'--ag-accent-text',
	'--ag-accent-bg',
	'--ag-accent-border',
	'--ag-accent-active-bg',
	'--ag-accent-active-border',
	// text
	'--ag-text-primary',
	'--ag-text-secondary',
	'--ag-text-muted',
	'--ag-text-faint',
	// error
	'--ag-error-bg',
	'--ag-error-border',
	'--ag-error-text',
	// warm
	'--ag-warm-bg',
	'--ag-warm-border',
	'--ag-warm-text',
	// success
	'--ag-success-bg',
	'--ag-success-border',
	'--ag-success-text',
	// shadow
	'--ag-shadow-none',
	'--ag-shadow-sm',
	'--ag-shadow-md',
	'--ag-shadow-dialog',
	'--ag-shadow-palette',
	// radius
	'--ag-radius-chip',
	'--ag-radius-button',
	'--ag-radius-input',
	'--ag-radius-card',
	'--ag-radius-widget',
	'--ag-radius-window',
	'--ag-radius-palette',
	'--ag-radius-keyhint',
	// backdrop
	'--ag-backdrop',
	// duration
	'--ag-duration-instant',
	'--ag-duration-fast',
	'--ag-duration-normal',
	'--ag-duration-slow',
	// ease
	'--ag-ease-in-out',
	'--ag-ease-out',
	'--ag-ease-in',
	'--ag-ease-bounce',
];

function parseCssVarsMap(cssVars: string): Map<string, string> {
	try {
		const obj = JSON.parse(cssVars) as Record<string, string>;
		return new Map(Object.entries(obj));
	} catch {
		return new Map();
	}
}

function initEntries(): VarEntry[] {
	const overrides = parseCssVarsMap(theme.css_vars);
	const style = getComputedStyle(document.documentElement);
	return ALL_AG_VARS.map((key) => ({
		key,
		value: overrides.get(key) ?? style.getPropertyValue(key).trim(),
	}));
}

let entries = $state<VarEntry[]>(initEntries());
// 保存済み変数リスト（保存成功時に更新し、unmount 時の CSS リセットに使う）
let savedCssVars = $state<VarEntry[]>(initEntries());
let saving = $state(false);
let saveError = $state<string | null>(null);
let savedSuccess = $state(false);
let confirmDelete = $state(false);

// テーマ名インライン編集
let editingName = $state(false);
let nameValue = $state('');

function startNameEdit() {
	nameValue = theme.name;
	editingName = true;
}

async function commitNameEdit() {
	if (!editingName) return; // Enter → blur の二重発火ガード
	editingName = false;
	const trimmed = nameValue.trim();
	if (!trimmed || trimmed === theme.name) return;
	await themeStore.updateTheme(theme.id, trimmed);
}

function cancelNameEdit() {
	editingName = false;
}

const isDirty = $derived(entries.some((e, i) => e.value !== savedCssVars[i]?.value));

// unmount 時に未保存の CSS vars をリセットする
// $effect の return は cleanup（unmount 時に呼ばれる）
$effect(() => {
	return () => {
		for (const { key, value } of savedCssVars) {
			document.documentElement.style.setProperty(key, value);
		}
	};
});

function handleValueChange(idx: number, newValue: string) {
	entries[idx].value = newValue;
	document.documentElement.style.setProperty(entries[idx].key, newValue);
}

async function handleSave() {
	saving = true;
	saveError = null;
	const cssVars: Record<string, string> = {};
	for (const { key, value } of entries) cssVars[key] = value;
	const updated = await themeStore.updateTheme(
		theme.id,
		undefined,
		undefined,
		JSON.stringify(cssVars),
	);
	saving = false;
	if (updated) {
		savedCssVars = entries.map((e) => ({ ...e }));
		savedSuccess = true;
		setTimeout(() => {
			savedSuccess = false;
		}, 2000);
	} else {
		saveError = themeStore.error ?? t('settings.appearance.save_failed');
	}
}

async function handleDelete() {
	if (!confirmDelete) {
		confirmDelete = true;
		return;
	}
	await themeStore.deleteTheme(theme.id);
	onClose();
}

// Group vars by prefix for display
const GROUP_ORDER = [
	'--ag-bg',
	'--ag-surface',
	'--ag-border',
	'--ag-accent',
	'--ag-text',
	'--ag-error',
	'--ag-warm',
	'--ag-success',
	'--ag-shadow',
	'--ag-radius',
	'--ag-backdrop',
	'--ag-duration',
	'--ag-ease',
];

const grouped = $derived.by(() => {
	const otherKey = t('settings.appearance.token_group_other');
	const groups: Record<string, VarEntry[]> = { [otherKey]: [] };
	for (const g of GROUP_ORDER) {
		groups[g] = [];
	}
	for (const entry of entries) {
		let matched = false;
		for (const g of GROUP_ORDER) {
			if (entry.key.startsWith(g)) {
				groups[g].push(entry);
				matched = true;
				break;
			}
		}
		if (!matched) groups[otherKey].push(entry);
	}
	return Object.entries(groups).filter(([, vs]) => vs.length > 0);
});
</script>

<div class="mt-4 rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface-1)] p-4">
	<ThemeEditorHeader
		themeName={theme.name}
		isBuiltin={theme.is_builtin}
		{isDirty}
		{saving}
		{savedSuccess}
		{confirmDelete}
		{editingName}
		bind:nameValue
		onStartNameEdit={startNameEdit}
		onCommitNameEdit={() => void commitNameEdit()}
		onCancelNameEdit={cancelNameEdit}
		onSave={() => void handleSave()}
		onDelete={() => void handleDelete()}
	/>

	{#if saveError}
		<p class="mb-2 text-xs text-[var(--ag-error-text)]">{saveError}</p>
	{/if}

	<ThemeEditorTokenEditor {entries} {grouped} onValueChange={handleValueChange} />
</div>
