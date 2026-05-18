<script lang="ts">
import { Copy, Plus } from '@lucide/svelte';
import type { Component } from 'svelte';
import Switch from '$lib/components/common/Switch.svelte';
import { t } from '$lib/i18n.svelte';
import { a11yStore } from '$lib/state/a11y.svelte';
import { themeStore } from '$lib/state/theme.svelte';

/**
 * Settings の外観カテゴリ pane (theme list + theme editor mount + a11y トグル + JSON import)。
 *
 * 引用元 guideline:
 *   docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、appearance pane 抽出)
 *   docs/l2_foundation/design-tokens.md §E (a11y トグル 3 種)
 *
 * design tokens v2: built-in は Dark / Light / Neumorph / Brutalist / HUD の 5 本。
 * built-in / custom theme は DB theme grid に並ぶ。 OS 追従モードは撤廃済。
 */

// PH-381: ThemeEditor は編集ボタンを押した時だけ load する dynamic import。
// biome-ignore lint/suspicious/noExplicitAny: dynamic-imported Svelte component
let ThemeEditorComponent = $state<Component<any, any, any> | null>(null);

async function ensureThemeEditorLoaded(): Promise<void> {
	if (ThemeEditorComponent) return;
	const mod = await import('./ThemeEditor.svelte');
	ThemeEditorComponent = mod.default;
}

let editingThemeId = $state<string | null>(null);
let showImportArea = $state(false);
let importJson = $state('');
let importError = $state<string | null>(null);
let copySuccess = $state(false);

const importPlaceholder =
	'{"name": "My Theme", "base_theme": "dark", "css_vars": "{}","is_builtin": false,"created_at": "","updated_at": ""}';

// built-in theme の表示名は i18n、 custom theme は DB の name。
const BUILTIN_LABEL_KEY: Record<string, string> = {
	dark: 'settings.appearance.theme_dark',
	light: 'settings.appearance.theme_light',
	neumorph: 'settings.appearance.theme_neumorph',
	brutalist: 'settings.appearance.theme_brutalist',
	hud: 'settings.appearance.theme_hud',
};

function themeLabel(theme: { id: string; name: string }): string {
	const key = BUILTIN_LABEL_KEY[theme.id];
	return key ? t(key) : theme.name;
}

async function cloneTheme(sourceId: string) {
	const source = themeStore.themes.find((t) => t.id === sourceId);
	const cssVars = source ? source.css_vars : '{}';
	const baseTheme = source ? source.base_theme : 'dark';
	const baseName = source ? themeLabel(source) : t('settings.appearance.theme_default_name');
	const created = await themeStore.createTheme(
		t('settings.appearance.clone_name', { name: baseName }),
		baseTheme,
		cssVars,
	);
	if (created) {
		await themeStore.setThemeMode(created.id);
		editingThemeId = created.id;
		void ensureThemeEditorLoaded();
	}
}

async function cloneCurrentTheme() {
	await cloneTheme(themeStore.activeMode);
}

async function handleExport(id: string) {
	const json = await themeStore.exportTheme(id);
	if (!json) return;
	await navigator.clipboard.writeText(json);
	copySuccess = true;
	setTimeout(() => (copySuccess = false), 2000);
}

function handleExportDownload(id: string) {
	void themeStore.exportTheme(id).then((json) => {
		if (!json) return;
		const theme = themeStore.themes.find((t) => t.id === id);
		const filename = `${theme?.name ?? 'theme'}.json`;
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	});
}

async function handleImport() {
	importError = null;
	const theme = await themeStore.importTheme(importJson);
	if (theme) {
		importJson = '';
		showImportArea = false;
	} else {
		importError = themeStore.error ?? t('settings.appearance.import_failed');
	}
}

function handleFileImport(e: Event) {
	const file = (e.currentTarget as HTMLInputElement).files?.[0];
	if (!file) return;
	const reader = new FileReader();
	reader.onload = () => {
		importJson = reader.result as string;
		showImportArea = true;
	};
	reader.readAsText(file);
}

// design tokens v2 §E: a11y トグル定義 (label / desc / 現在値 / setter)。
const a11yToggles = $derived([
	{
		flag: 'reduceTransparency' as const,
		label: t('settings.appearance.a11y_reduce_transparency_label'),
		desc: t('settings.appearance.a11y_reduce_transparency_desc'),
		checked: a11yStore.reduceTransparency,
	},
	{
		flag: 'increaseContrast' as const,
		label: t('settings.appearance.a11y_increase_contrast_label'),
		desc: t('settings.appearance.a11y_increase_contrast_desc'),
		checked: a11yStore.increaseContrast,
	},
	{
		flag: 'reduceMotion' as const,
		label: t('settings.appearance.a11y_reduce_motion_label'),
		desc: t('settings.appearance.a11y_reduce_motion_desc'),
		checked: a11yStore.reduceMotion,
	},
]);
</script>

<div
	id="settings-panel-appearance"
	role="tabpanel"
	aria-labelledby="tab-appearance"
	class="space-y-4 px-6 py-5"
>
	<h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">{t('settings.appearance.heading')}</h3>
	<div>
		<div class="mb-3 flex items-center justify-between">
			<p class="text-sm font-medium text-[var(--ag-text-primary)]">{t('settings.appearance.theme_heading')}</p>
			<button
				type="button"
				class="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--ag-text-secondary)] transition-colors hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ag-accent)]"
				onclick={cloneCurrentTheme}
			>
				<Plus class="h-3.5 w-3.5" />
				{t('settings.appearance.clone_current')}
			</button>
		</div>
		<div class="grid grid-cols-2 gap-2">
			<!-- テーマ（built-in 5 本 + カスタム） -->
			{#each themeStore.themes as theme (theme.id)}
				<div class="flex flex-col gap-1">
					<button
						type="button"
						class="flex flex-1 flex-col gap-1 rounded-lg border px-4 py-3 text-left text-sm transition-[color,background-color,border-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {themeStore.activeMode ===
						theme.id
							? 'border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] text-[var(--ag-accent-text)]'
							: 'border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]'}"
						onclick={() => {
							void themeStore.setThemeMode(theme.id);
							editingThemeId = null;
						}}
					>
						<span class="font-medium">{themeLabel(theme)}</span>
						<span class="text-xs opacity-70">{theme.is_builtin ? t('settings.appearance.builtin_badge') : t('settings.appearance.custom_badge')}</span>
					</button>
					<div class="flex gap-1 px-1">
						{#if !theme.is_builtin}
							<button
								type="button"
								class="rounded px-2 py-0.5 text-xs text-[var(--ag-text-muted)] transition-colors hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ag-accent)]"
								onclick={() => {
									if (editingThemeId === theme.id) {
										editingThemeId = null;
									} else {
										editingThemeId = theme.id;
										void ensureThemeEditorLoaded();
									}
								}}
							>
								{editingThemeId === theme.id ? t('common.close') : t('common.edit')}
							</button>
						{:else}
							<button
								type="button"
								class="flex items-center gap-0.5 rounded px-2 py-0.5 text-xs text-[var(--ag-text-muted)] transition-colors hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ag-accent)]"
								onclick={() => void cloneTheme(theme.id)}
							>
								{t('settings.appearance.clone_and_edit')}
							</button>
						{/if}
						<button
							type="button"
							class="flex items-center gap-0.5 rounded px-2 py-0.5 text-xs text-[var(--ag-text-muted)] transition-colors hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ag-accent)]"
							onclick={() => void handleExport(theme.id)}
						>
							<Copy class="h-3 w-3" />
							{copySuccess ? t('settings.appearance.copy_done') : t('settings.appearance.copy_button')}
						</button>
						<button
							type="button"
							class="rounded px-2 py-0.5 text-xs text-[var(--ag-text-muted)] transition-colors hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ag-accent)]"
							onclick={() => handleExportDownload(theme.id)}
						>
							{t('settings.appearance.download_button')}
						</button>
					</div>
				</div>
			{/each}
		</div>

		<!-- テーマエディタ（インライン展開） -->
		{#if editingThemeId}
			{@const editingTheme = themeStore.themes.find((t) => t.id === editingThemeId)}
			{#if editingTheme}
				{#if ThemeEditorComponent}
					{@const TE = ThemeEditorComponent}
					<TE theme={editingTheme} onClose={() => (editingThemeId = null)} />
				{:else}
					<div class="text-sm text-[var(--ag-text-muted)]">{t('settings.appearance.editor_loading')}</div>
				{/if}
			{/if}
		{/if}

		<!-- アクセシビリティ (design tokens v2 §E) -->
		<div class="mt-4 space-y-3 border-t border-[var(--ag-border)] pt-4">
			<p class="text-sm font-medium text-[var(--ag-text-primary)]">{t('settings.appearance.a11y_heading')}</p>
			{#each a11yToggles as toggle (toggle.flag)}
				<div class="flex items-center justify-between gap-4">
					<div class="min-w-0">
						<p class="text-sm text-[var(--ag-text-primary)]">{toggle.label}</p>
						<p class="mt-0.5 text-xs text-[var(--ag-text-muted)]">{toggle.desc}</p>
					</div>
					<div class="shrink-0">
						<Switch
							checked={toggle.checked}
							onChange={(enabled) => a11yStore.setFlag(toggle.flag, enabled)}
							aria-label={toggle.label}
						/>
					</div>
				</div>
			{/each}
		</div>

		<!-- JSON インポート -->
		<div class="mt-4 border-t border-[var(--ag-border)] pt-4">
			<div class="flex items-center gap-3">
				<button
					type="button"
					class="text-xs text-[var(--ag-text-muted)] underline-offset-2 hover:text-[var(--ag-text-secondary)] hover:underline focus-visible:outline-none"
					onclick={() => {
						showImportArea = !showImportArea;
						importError = null;
					}}
				>
					{t('settings.appearance.import_json_button')}
				</button>
				<label
					class="cursor-pointer text-xs text-[var(--ag-text-muted)] underline-offset-2 hover:text-[var(--ag-text-secondary)] hover:underline"
				>
					{t('settings.appearance.choose_file')}
					<input
						type="file"
						accept=".json"
						class="sr-only"
						onchange={handleFileImport}
					/>
				</label>
			</div>
			{#if showImportArea}
				<div class="mt-2 space-y-2">
					<textarea
						bind:value={importJson}
						placeholder={importPlaceholder}
						rows={4}
						class="w-full resize-none rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-2 font-mono text-xs text-[var(--ag-text-primary)] placeholder:text-[var(--ag-text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--ag-accent)]"
					></textarea>
					{#if importError}
						<p class="text-xs text-[var(--ag-error-text)]">{importError}</p>
					{/if}
					<button
						type="button"
						disabled={!importJson.trim()}
						class="rounded-md bg-[var(--ag-accent-bg)] px-3 py-1.5 text-xs font-medium text-[var(--ag-accent-text)] transition-colors hover:bg-[var(--ag-accent-active-bg)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ag-accent)]"
						onclick={handleImport}
					>
						{t('settings.export_import.import_button')}
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>
