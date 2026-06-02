<script lang="ts">
import { ExternalLink, FolderOpen, Info } from '@lucide/svelte';
import { onMount } from 'svelte';
import { t } from '$lib/i18n.svelte';
import { type AppPaths, getAppPaths } from '$lib/ipc/config';
import { revealInExplorer } from '$lib/ipc/launch';
import { toastStore } from '$lib/state/toast.svelte';
import { getErrorMessage } from '$lib/utils/format-error';

let appVersion = $state<string | null>(null);
let tauriVersion = $state<string | null>(null);
let appPaths = $state<AppPaths | null>(null);

onMount(async () => {
	try {
		const { getVersion, getTauriVersion } = await import('@tauri-apps/api/app');
		appVersion = await getVersion();
		tauriVersion = await getTauriVersion();
	} catch {
		// ブラウザ環境（テスト等）では Tauri API が無いため fallback
		appVersion = 'unknown';
	}
	try {
		appPaths = await getAppPaths();
	} catch {
		// IPC が解決できない環境 (ブラウザ test 等) では path 表示を諦める
		appPaths = null;
	}
});

const repoUrl = 'https://github.com/emanon-i/arcagate';

/**
 * PH-CF-1300: 指定された path を Explorer で開く (既存 reveal_in_explorer 経路再利用)。
 * 失敗時は toast で通知。
 */
async function openInExplorer(path: string): Promise<void> {
	try {
		await revealInExplorer(path);
	} catch (e) {
		toastStore.add(t('toast.explorer_failed', { error: getErrorMessage(e) }), 'error');
	}
}

// PH-CF-1300: data location section の表示順 (固定)。 各 row は kind = test-id suffix、
// label = i18n キー、 getter = appPaths から path を取り出す関数。
const DATA_ROWS: {
	kind: 'db' | 'appdata' | 'log';
	labelKey: string;
	getter: (p: AppPaths) => string;
}[] = [
	{ kind: 'db', labelKey: 'settings.about.data_location_db_label', getter: (p) => p.db },
	{
		kind: 'appdata',
		labelKey: 'settings.about.data_location_appdata_label',
		getter: (p) => p.app_data_dir,
	},
	{ kind: 'log', labelKey: 'settings.about.data_location_log_label', getter: (p) => p.log_dir },
];
</script>

<div class="space-y-5">
	<div class="flex items-center gap-3">
		<div class="rounded-full bg-[var(--ag-surface-2)] p-2 text-[var(--ag-text-muted)]">
			<Info class="h-5 w-5" />
		</div>
		<div>
			<h3 class="text-base font-semibold text-[var(--ag-text-primary)]">Arcagate</h3>
			<p class="text-xs text-[var(--ag-text-secondary)]">
				{t('settings.about.description')}
			</p>
		</div>
	</div>

	<dl class="space-y-2 text-sm">
		<div class="flex justify-between">
			<dt class="text-[var(--ag-text-muted)]">Version</dt>
			<dd
				class="font-mono text-[var(--ag-text-primary)]"
				data-testid="about-app-version"
			>
				{appVersion ?? '...'}
			</dd>
		</div>
		{#if tauriVersion}
			<div class="flex justify-between">
				<dt class="text-[var(--ag-text-muted)]">Tauri</dt>
				<dd class="font-mono text-[var(--ag-text-primary)]">{tauriVersion}</dd>
			</div>
		{/if}
		<div class="flex justify-between">
			<dt class="text-[var(--ag-text-muted)]">License</dt>
			<dd class="text-[var(--ag-text-primary)]">MIT</dd>
		</div>
	</dl>

	<a
		href={repoUrl}
		target="_blank"
		rel="noopener noreferrer"
		class="inline-flex items-center gap-1.5 text-sm text-[var(--ag-accent-text)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
	>
		<ExternalLink class="h-3.5 w-3.5" />
		{t('settings.about.source_code')}
	</a>

	<!--
		PH-CF-1300: データ透明化。 user が「自分の PC のどこにデータがあるか」 を一目で
		把握できるよう、 DB / app data / log の絶対 path と「フォルダを開く」 button を
		表示する (`docs/l3_phases/clean-feedback/PH-CF-1300_data-transparency.md`)。
	-->
	{#if appPaths}
		<div class="border-t border-[var(--ag-border)] pt-4">
			<h4 class="text-sm font-semibold text-[var(--ag-text-primary)]">
				{t('settings.about.data_location_heading')}
			</h4>
			<p class="mt-1 text-xs text-[var(--ag-text-muted)]">
				{t('settings.about.data_location_intro')}
			</p>
			<dl class="mt-3 space-y-3 text-sm">
				{#each DATA_ROWS as row (row.kind)}
					{@const label = t(row.labelKey)}
					{@const path = row.getter(appPaths)}
					<div class="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
						<dt class="min-w-[88px] text-[var(--ag-text-muted)]">{label}</dt>
						<dd class="flex min-w-0 flex-1 items-start gap-2">
							<code
								class="min-w-0 flex-1 break-all rounded bg-[var(--ag-surface-2)] px-2 py-1 font-mono text-xs text-[var(--ag-text-primary)]"
								data-testid="about-data-location-{row.kind}">{path}</code
							>
							<button
								type="button"
								class="inline-flex shrink-0 items-center gap-1 rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2 py-1 text-xs text-[var(--ag-text-primary)] transition-[background-color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)]"
								aria-label={t('settings.about.data_location_open_aria', { kind: label })}
								data-testid="about-data-open-{row.kind}"
								onclick={() => void openInExplorer(path)}
							>
								<FolderOpen class="h-3.5 w-3.5" />
								{t('settings.about.data_location_open')}
							</button>
						</dd>
					</div>
				{/each}
			</dl>
		</div>
	{/if}
</div>
