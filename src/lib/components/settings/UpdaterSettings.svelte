<script lang="ts">
import { CheckCircle2, Download, RefreshCw } from '@lucide/svelte';
import { check, type Update } from '@tauri-apps/plugin-updater';
import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { formatDate } from '$lib/utils/intl-formatter.svelte';
import { formatIpcError } from '$lib/utils/ipc-error';

// PH-446 batch-100 — Updater UI (Settings 統合 + 手動チェック)
// 自動チェック (起動時 + 24h 間隔) は別途 updater store で実装

let checking = $state(false);
let installing = $state(false);
let available = $state<Update | null>(null);
let lastChecked = $state<Date | null>(null);
// PH-CF-300 (2026-05-23): window.confirm 撤去。 install 確認は ConfirmDialog 経由。
let installConfirmOpen = $state(false);

async function handleCheck() {
	checking = true;
	available = null;
	try {
		const update = await check();
		available = update;
		lastChecked = new Date();
		if (update) {
			toastStore.add(t('toast.version_available', { version: update.version }), 'info');
		} else {
			toastStore.add(t('toast.version_up_to_date'), 'success');
		}
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: t('error.op.update_check') }, e), 'error');
	} finally {
		checking = false;
	}
}

function openInstallConfirm(): void {
	if (!available) return;
	installConfirmOpen = true;
}

function cancelInstallConfirm(): void {
	installConfirmOpen = false;
}

async function handleInstall() {
	if (!available) return;
	installConfirmOpen = false;
	installing = true;
	try {
		// downloadAndInstall: download + 適用 + 自動再起動
		await available.downloadAndInstall((event) => {
			if (event.event === 'Started') {
				toastStore.add(t('toast.download_started'), 'info');
			} else if (event.event === 'Finished') {
				toastStore.add(t('toast.download_complete_restart'), 'success');
			}
		});
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: t('error.op.update_install') }, e), 'error');
		installing = false;
	}
}
</script>

<div class="space-y-3" data-testid="updater-settings">
	<div>
		<p class="text-sm font-medium text-[var(--ag-text-primary)]">{t('settings.updater.heading')}</p>
		<p class="text-xs text-[var(--ag-text-muted)]">
			{t('settings.updater.desc')}
		</p>
	</div>

	<div class="flex items-center gap-2">
		<Button
			type="button"
			variant="default"
			size="sm"
			onclick={() => void handleCheck()}
			disabled={checking || installing}
			data-testid="updater-check"
		>
			<RefreshCw class="h-3.5 w-3.5 {checking ? 'animate-spin' : ''}" />
			{checking ? t('settings.updater.checking') : t('settings.updater.check_button')}
		</Button>

		{#if available}
			<Button
				type="button"
				variant="default"
				size="sm"
				onclick={openInstallConfirm}
				disabled={installing}
				data-testid="updater-install"
			>
				<Download class="h-3.5 w-3.5" />
				{installing ? t('settings.updater.installing') : t('settings.updater.install_button', { version: available.version })}
			</Button>
		{/if}
	</div>

	{#if lastChecked}
		<p class="text-xs text-[var(--ag-text-muted)]">
			{t('settings.updater.last_checked', { time: formatDate(lastChecked) })}
		</p>
	{/if}

	{#if available}
		<div
			class="rounded border border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] px-3 py-2 text-xs"
			data-testid="updater-info"
		>
			<p class="font-medium text-[var(--ag-accent-text)]">{t('settings.updater.new_version', { version: available.version })}</p>
			{#if available.date}
				<p class="text-[var(--ag-text-muted)]">{available.date}</p>
			{/if}
			{#if available.body}
				<p class="mt-1 whitespace-pre-wrap text-[var(--ag-text-secondary)]">{available.body}</p>
			{/if}
		</div>
	{:else if lastChecked}
		<div class="flex items-center gap-1 text-xs text-[var(--ag-text-muted)]">
			<CheckCircle2 class="h-3.5 w-3.5 text-[var(--ag-success-text)]" />
			{t('settings.updater.up_to_date')}
		</div>
	{/if}
</div>

<!-- PH-CF-300: 自動再起動 = 影響範囲ありの操作。 ConfirmDialog 経由。 -->
{#if available}
	<ConfirmDialog
		open={installConfirmOpen}
		title={t('settings.updater.install_dialog_title')}
		description={t('settings.updater.install_confirm', { version: available.version })}
		confirmLabel={t('settings.updater.install_dialog_confirm')}
		onConfirm={() => void handleInstall()}
		onCancel={cancelInstallConfirm}
	/>
{/if}
