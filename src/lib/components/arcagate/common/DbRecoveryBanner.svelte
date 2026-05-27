<script lang="ts">
import { AlertTriangle, Check, Copy } from '@lucide/svelte';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { onMount } from 'svelte';
import { t } from '$lib/i18n.svelte';
import { ackDbRecoveryNotice, type DbRecoveryNotice, getDbRecoveryNotice } from '$lib/ipc/config';
import { toastStore } from '$lib/state/toast.svelte';

/**
 * DB self-recovery 永続 banner (2026-05-27 新設)。
 *
 * 旧実装は recovery 発生時に native dialog (`blocking_show`) を 1 回出すだけで、
 * dialog を閉じ忘れた / 控え忘れた user は backup path を失った。 本 banner は
 * backend が app data dir に書く marker file (`db-recovery-notice.json`) を
 * `cmd_get_db_recovery_notice` で読み、 「了解」 (= `cmd_ack_db_recovery_notice`
 * で marker 削除) されるまで起動毎に top sticky で再表示する。
 *
 * 永続性が要件のため自動 dismiss / auto-hide はしない。 backup path はそのまま
 * 表示 + clipboard コピーボタン (frontend で生 path を扱うため i18n 経由の
 * `{path}` 補間は不要、 path 自体は user 入力でなく backend 由来でハードコード
 * 文字列ではない)。
 */

let notice = $state<DbRecoveryNotice | null>(null);
let dismissing = $state(false);

onMount(async () => {
	try {
		notice = await getDbRecoveryNotice();
	} catch {
		// marker 読み込み失敗は起動の妨げにしない (best-effort)。
		notice = null;
	}
});

async function handleAck(): Promise<void> {
	if (dismissing) return;
	dismissing = true;
	try {
		await ackDbRecoveryNotice();
		notice = null;
	} catch {
		// ack 失敗時は banner を残す (再試行可能、 marker は backend にまだ存在)。
		dismissing = false;
	}
}

async function handleCopyPath(): Promise<void> {
	if (!notice) return;
	try {
		await writeText(notice.backup_path);
		toastStore.add(t('db_recovery.path_copied'), 'success');
	} catch {
		// clipboard 失敗時は黙る (path はそのまま表示されているので手動コピー可能)。
	}
}
</script>

{#if notice}
	<div
		class="sticky top-0 z-[60] border-b border-[var(--ag-warm-border)] bg-[var(--ag-warm-bg)] px-4 py-3 text-[var(--ag-warm-text)] shadow-[var(--ag-shadow-md)]"
		role="alert"
		aria-live="assertive"
		data-testid="db-recovery-banner"
	>
		<div class="mx-auto flex max-w-5xl items-start gap-3">
			<AlertTriangle class="mt-0.5 h-5 w-5 shrink-0" />
			<div class="min-w-0 flex-1">
				<div class="text-sm font-semibold">{t('db_recovery.title')}</div>
				<p class="mt-1 text-sm leading-relaxed">
					{t('db_recovery.message', { ack: t('db_recovery.ack') })}
				</p>
				<div class="mt-2 flex flex-wrap items-center gap-2">
					<span class="text-xs uppercase opacity-70">{t('db_recovery.backup_path_label')}</span>
					<code
						class="min-w-0 flex-1 break-all rounded bg-[var(--ag-surface-3)] px-2 py-1 font-mono text-xs text-[var(--ag-text-primary)]"
						data-testid="db-recovery-backup-path">{notice.backup_path}</code
					>
				</div>
			</div>
			<div class="flex shrink-0 items-center gap-2">
				<button
					type="button"
					class="inline-flex items-center gap-1 rounded-[var(--ag-radius-card)] border border-[var(--ag-warm-border)] bg-[var(--ag-surface-3)] px-3 py-1.5 text-xs text-[var(--ag-text-primary)] transition-[background-color,color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)]"
					aria-label={t('db_recovery.copy_path_aria')}
					data-testid="db-recovery-copy-path"
					onclick={() => void handleCopyPath()}
				>
					<Copy class="h-3.5 w-3.5" />
					{t('db_recovery.copy_path')}
				</button>
				<button
					type="button"
					class="inline-flex items-center gap-1 rounded-[var(--ag-radius-card)] bg-[var(--ag-accent)] px-3 py-1.5 text-xs font-medium text-[var(--ag-accent-text)] transition-[background-color,opacity] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:opacity-90 disabled:opacity-60"
					data-testid="db-recovery-ack"
					disabled={dismissing}
					onclick={() => void handleAck()}
				>
					<Check class="h-3.5 w-3.5" />
					{t('db_recovery.ack')}
				</button>
			</div>
		</div>
	</div>
{/if}
