<script lang="ts">
import { CopyPlus, Download, Plus } from '@lucide/svelte';
import type { Component } from 'svelte';
import Switch from '$lib/components/common/Switch.svelte';
import { t } from '$lib/i18n.svelte';
import { a11yStore } from '$lib/state/a11y.svelte';
import { themeStore } from '$lib/state/theme.svelte';
import { toastStore } from '$lib/state/toast.svelte';

/**
 * Settings の外観カテゴリ pane (theme list + theme editor mount + a11y トグル + JSON import)。
 *
 * 引用元 guideline:
 *   docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、appearance pane 抽出)
 *   docs/l2_foundation/design-tokens.md §E (a11y トグル 3 種)
 *
 * PH-CF-800 F1: built-in は 3 系統 (glass / brutalist / neumorph) × Dark/Light の 6 本。
 * HUD は user 判断で削除済。 並び順は migration 041 の sort_order で固定。
 * built-in / custom theme は DB theme grid に並ぶ。 OS 追従モードは撤廃済。
 *
 * PH-CF-800 F4 + F5: theme カード下のアクションボタンはアイコン + tooltip 統一。
 * 「コピーして編集」 / 「コピー」 / 「ダウンロード」 の 3 つから 「複製」 / 「ダウンロード」 の
 * 2 つに集約: 旧「コピー」 (clipboard 書き込み) は user 意図不明だったため廃止し、
 * 旧「コピーして編集」 と統合した「複製」 = `cloneTheme()` に統一。
 *
 * PH-CF-800 F6: カスタムテーマは backend `MAX_CUSTOM_THEMES` で上限を持つ。 「N / MAX」 を
 * 常時表示し、 上限到達で「複製」 「インポート」 ボタンを disabled に。
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

const importPlaceholder =
	'{"name": "My Theme", "base_theme": "dark", "css_vars": "{}","is_builtin": false,"created_at": "","updated_at": ""}';

// PH-CF-800 F1: built-in theme の表示名は i18n、 custom theme は DB の name。
// HUD は migration 041 で builtin から削除済のため key も削除。
const BUILTIN_LABEL_KEY: Record<string, string> = {
	dark: 'settings.appearance.theme_dark',
	light: 'settings.appearance.theme_light',
	brutalist: 'settings.appearance.theme_brutalist',
	'brutalist-dark': 'settings.appearance.theme_brutalist_dark',
	neumorph: 'settings.appearance.theme_neumorph',
	'neumorph-dark': 'settings.appearance.theme_neumorph_dark',
};

function themeLabel(theme: { id: string; name: string }): string {
	const key = BUILTIN_LABEL_KEY[theme.id];
	return key ? t(key) : theme.name;
}

// PH-CF-800 F6: 上限到達で「複製」 / 「インポート」 を disable する derive。
let isQuotaReached = $derived(
	themeStore.customQuota.max > 0 && themeStore.customQuota.used >= themeStore.customQuota.max,
);
// 「現在のテーマを複製」 button の disable 条件 = テーマ未ロード OR 上限到達 OR
// active theme が themes 配列に存在しない (= F3 graceful fail 経路)。
let canCloneCurrent = $derived(
	themeStore.themes.some((t) => t.id === themeStore.activeMode) && !isQuotaReached,
);

async function cloneTheme(sourceId: string) {
	// PH-CF-800 F3: ソース theme を厳密に解決し、 見つからなければ silent fallback でなく
	// toast でエラーを返す (旧実装は cssVars='{}' / baseTheme='dark' のデフォルト複製に
	// 黙って降格し、 user は「複製したつもりが全く別の theme になった」 と困惑)。
	const source = themeStore.themes.find((t) => t.id === sourceId);
	if (!source) {
		toastStore.add(t('settings.appearance.clone_source_missing'), 'error');
		return;
	}
	if (isQuotaReached) {
		// 念のためのガード (UI で disable しているが race protection)。
		toastStore.add(
			t('settings.appearance.quota_reached', {
				max: themeStore.customQuota.max,
			}),
			'error',
		);
		return;
	}
	const created = await themeStore.createTheme(
		t('settings.appearance.clone_name', { name: themeLabel(source) }),
		source.base_theme,
		source.css_vars,
	);
	if (created) {
		await themeStore.setThemeMode(created.id);
		editingThemeId = created.id;
		void ensureThemeEditorLoaded();
	}
}

async function cloneCurrentTheme() {
	// PH-CF-800 F3: ボタンは canCloneCurrent で disable 済だが、 keyboard activation 等の
	// race を考慮し guard を残す。
	if (!canCloneCurrent) return;
	await cloneTheme(themeStore.activeMode);
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
		<div class="mb-3 flex items-center justify-between gap-3">
			<p class="text-sm font-medium text-[var(--ag-text-primary)]">{t('settings.appearance.theme_heading')}</p>
			<div class="flex items-center gap-2">
				<!-- PH-CF-800 F6: カスタムテーマ件数 / 上限 (常時表示)。 -->
				{#if themeStore.customQuota.max > 0}
					<span
						class="text-xs tabular-nums text-[var(--ag-text-muted)]"
						data-testid="settings-custom-theme-quota"
					>
						{t('settings.appearance.custom_quota', {
							used: themeStore.customQuota.used,
							max: themeStore.customQuota.max,
						})}
					</span>
				{/if}
				<button
					type="button"
					class="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--ag-text-secondary)] transition-colors hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ag-accent)] disabled:cursor-not-allowed disabled:opacity-50"
					data-testid="settings-clone-current-theme"
					onclick={cloneCurrentTheme}
					disabled={!canCloneCurrent}
					title={isQuotaReached
						? t('settings.appearance.quota_reached', { max: themeStore.customQuota.max })
						: t('settings.appearance.clone_current')}
				>
					<Plus class="h-3.5 w-3.5" />
					{t('settings.appearance.clone_current')}
				</button>
			</div>
		</div>
		<div class="grid grid-cols-2 gap-2">
			<!-- PH-CF-800 F1: theme は migration 041 の sort_order 順で 6 builtin + カスタム。 -->
			{#each themeStore.themes as theme (theme.id)}
				<div class="flex flex-col gap-1" data-testid="settings-theme-card-{theme.id}">
					<button
						type="button"
						class="flex flex-1 flex-col gap-1 rounded-lg border px-4 py-3 text-left text-sm transition-[color,background-color,border-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {themeStore.activeMode ===
						theme.id
							? 'border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] text-[var(--ag-accent-text)]'
							: 'border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]'}"
						data-testid="settings-theme-button-{theme.id}"
						onclick={() => {
							void themeStore.setThemeMode(theme.id);
							editingThemeId = null;
						}}
					>
						<span class="font-medium">{themeLabel(theme)}</span>
						<span class="text-xs opacity-70">{theme.is_builtin ? t('settings.appearance.builtin_badge') : t('settings.appearance.custom_badge')}</span>
					</button>
					<!-- PH-CF-800 F4 + F5: アクションは「複製」 / 「ダウンロード」 の 2 つに集約し、 アイコン
					     + tooltip (`title` / `aria-label`) のみのアイコンボタンに統一。 旧「コピー」
					     (clipboard 書き込み) は user 意図不明だったため廃止。 custom は「編集」 を加えて
					     最大 3 つ、 builtin は「複製」 + 「ダウンロード」 の 2 つ。 -->
					<div class="flex gap-1 px-1">
						{#if !theme.is_builtin}
							<button
								type="button"
								class="rounded px-2 py-0.5 text-xs text-[var(--ag-text-muted)] transition-colors hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ag-accent)]"
								data-testid="settings-theme-edit-{theme.id}"
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
						{/if}
						<button
							type="button"
							class="rounded p-1 text-[var(--ag-text-muted)] transition-colors hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ag-accent)] disabled:cursor-not-allowed disabled:opacity-50"
							data-testid="settings-theme-clone-{theme.id}"
							onclick={() => void cloneTheme(theme.id)}
							disabled={isQuotaReached}
							aria-label={isQuotaReached
								? t('settings.appearance.quota_reached', { max: themeStore.customQuota.max })
								: t('settings.appearance.clone_button')}
							title={isQuotaReached
								? t('settings.appearance.quota_reached', { max: themeStore.customQuota.max })
								: t('settings.appearance.clone_button')}
						>
							<CopyPlus class="h-3.5 w-3.5" />
						</button>
						<button
							type="button"
							class="rounded p-1 text-[var(--ag-text-muted)] transition-colors hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ag-accent)]"
							data-testid="settings-theme-download-{theme.id}"
							onclick={() => handleExportDownload(theme.id)}
							aria-label={t('settings.appearance.download_button')}
							title={t('settings.appearance.download_button')}
						>
							<Download class="h-3.5 w-3.5" />
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
					{#if isQuotaReached}
						<p class="text-xs text-[var(--ag-warm-text)]">
							{t('settings.appearance.quota_reached', {
								max: themeStore.customQuota.max,
							})}
						</p>
					{/if}
					<button
						type="button"
						disabled={!importJson.trim() || isQuotaReached}
						class="rounded-md bg-[var(--ag-accent-bg)] px-3 py-1.5 text-xs font-medium text-[var(--ag-accent-text)] transition-colors hover:bg-[var(--ag-accent-active-bg)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ag-accent)]"
						data-testid="settings-theme-import-submit"
						onclick={handleImport}
					>
						{t('settings.export_import.import_button')}
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>
