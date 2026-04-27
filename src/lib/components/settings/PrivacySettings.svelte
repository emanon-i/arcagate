<script lang="ts">
import { invoke } from '@tauri-apps/api/core';
import { onMount } from 'svelte';
import { getErrorMessage } from '$lib/utils/format-error';

let telemetryOptIn = $state(false);
let crashReportOptIn = $state(false);
let telemetryError = $state<string | null>(null);
let crashError = $state<string | null>(null);

onMount(async () => {
	try {
		telemetryOptIn = await invoke<boolean>('cmd_get_telemetry_opt_in');
	} catch (e) {
		telemetryError = getErrorMessage(e);
	}
	try {
		crashReportOptIn = await invoke<boolean>('cmd_get_crash_report_opt_in');
	} catch (e) {
		crashError = getErrorMessage(e);
	}
});

async function toggleTelemetry(enabled: boolean): Promise<void> {
	telemetryError = null;
	try {
		await invoke('cmd_set_telemetry_opt_in', { enabled });
		telemetryOptIn = enabled;
	} catch (e) {
		telemetryError = getErrorMessage(e);
	}
}

async function toggleCrash(enabled: boolean): Promise<void> {
	crashError = null;
	try {
		await invoke('cmd_set_crash_report_opt_in', { enabled });
		crashReportOptIn = enabled;
	} catch (e) {
		crashError = getErrorMessage(e);
	}
}
</script>

<div class="space-y-6">
  <div class="space-y-2">
    <h4 class="text-sm font-semibold text-[var(--ag-text-primary)]">匿名 Telemetry (PH-465)</h4>
    <p class="text-xs text-[var(--ag-text-muted)]">
      操作カウント・version・OS ビルド・エラーコード別件数のみ送信。個別アイテム名・パス・クエリ・ユーザ識別子は送信されません。詳細は <a href="https://github.com/emanon-i/arcagate/blob/main/PRIVACY.md" target="_blank" rel="noreferrer" class="underline">PRIVACY.md</a> 参照。
    </p>
    <label class="flex cursor-pointer items-center gap-3">
      <input
        data-testid="telemetry-opt-in"
        type="checkbox"
        class="h-4 w-4 rounded border accent-primary"
        checked={telemetryOptIn}
        onchange={(e) => toggleTelemetry((e.currentTarget as HTMLInputElement).checked)}
      />
      <span class="text-sm">匿名 Telemetry を有効にする (デフォルト OFF)</span>
    </label>
    {#if telemetryError}
      <p class="text-xs text-red-500" role="alert">{telemetryError}</p>
    {/if}
  </div>

  <div class="space-y-2">
    <h4 class="text-sm font-semibold text-[var(--ag-text-primary)]">Crash 報告 (PH-466)</h4>
    <p class="text-xs text-[var(--ag-text-muted)]">
      未補足 panic / 致命エラーの stack trace + version + OS ビルドのみ送信。DB 内容・設定値・操作内容は送信されません。
    </p>
    <label class="flex cursor-pointer items-center gap-3">
      <input
        data-testid="crash-opt-in"
        type="checkbox"
        class="h-4 w-4 rounded border accent-primary"
        checked={crashReportOptIn}
        onchange={(e) => toggleCrash((e.currentTarget as HTMLInputElement).checked)}
      />
      <span class="text-sm">Crash 報告を有効にする (デフォルト OFF)</span>
    </label>
    {#if crashError}
      <p class="text-xs text-red-500" role="alert">{crashError}</p>
    {/if}
  </div>
</div>
