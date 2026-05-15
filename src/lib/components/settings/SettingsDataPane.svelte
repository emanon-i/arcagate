<script lang="ts">
import { RotateCcw } from '@lucide/svelte';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';
import { configStore } from '$lib/state/config.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { getErrorMessage } from '$lib/utils/format-error';
import ExportImport from './ExportImport.svelte';

/**
 * Settings のデータカテゴリ pane (ExportImport)。
 *
 * D-15: PrivacySettings (Telemetry / Crash opt-in) は削除 (機能ごと撤去、PostHog
 * 配線済の dead code を解消)。
 *
 * K-4 (2026-05-15): user 報告「設定画面にリセットボタンほしい」。 destructive な
 * action なので Data pane に配置 (Export/Import と同 category)、 confirm 経由で実行。
 */

let resetting = $state(false);

async function handleReset(): Promise<void> {
	if (resetting) return;
	if (!window.confirm(t('settings.data.reset_confirm'))) return;
	resetting = true;
	try {
		await configStore.resetAllSettings();
		toastStore.add(t('settings.data.reset_done'), 'success');
	} catch (e) {
		toastStore.add(t('settings.data.reset_failed', { error: getErrorMessage(e) }), 'error');
	} finally {
		resetting = false;
	}
}
</script>

<div
	id="settings-panel-data"
	role="tabpanel"
	aria-labelledby="tab-data"
	class="space-y-6 px-6 py-5"
>
	<h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">{t('settings.data.heading')}</h3>
	<ExportImport />

	<!-- K-4: 全設定 reset (destructive、 user data は対象外、 confirm 経由)。 -->
	<div class="border-t border-[var(--ag-border)] pt-5">
		<div class="flex items-start justify-between gap-4">
			<div class="min-w-0">
				<p class="text-sm font-medium text-[var(--ag-text-primary)]">{t('settings.data.reset_label')}</p>
				<p class="mt-0.5 text-xs text-[var(--ag-text-muted)]">
					{t('settings.data.reset_desc')}
				</p>
			</div>
			<Button
				type="button"
				variant="outline"
				size="sm"
				disabled={resetting}
				onclick={() => void handleReset()}
				data-testid="settings-reset-all"
			>
				<RotateCcw class="h-3.5 w-3.5" />
				{resetting ? t('settings.data.resetting') : t('settings.data.reset_button')}
			</Button>
		</div>
	</div>
</div>
