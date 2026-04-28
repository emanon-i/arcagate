<script lang="ts">
import { CheckCircle2, Download, RefreshCw } from '@lucide/svelte';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { Button } from '$lib/components/ui/button';
import { toastStore } from '$lib/state/toast.svelte';
import { formatIpcError } from '$lib/utils/ipc-error';

// PH-446 batch-100 — Updater UI (Settings 統合 + 手動チェック)
// 自動チェック (起動時 + 24h 間隔) は別途 updater store で実装

let checking = $state(false);
let installing = $state(false);
let available = $state<Update | null>(null);
let lastChecked = $state<Date | null>(null);

async function handleCheck() {
	checking = true;
	available = null;
	try {
		const update = await check();
		available = update;
		lastChecked = new Date();
		if (update) {
			toastStore.add(`新バージョン ${update.version} が利用可能です`, 'info');
		} else {
			toastStore.add('最新バージョンです', 'success');
		}
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: 'アップデート確認' }, e), 'error');
	} finally {
		checking = false;
	}
}

async function handleInstall() {
	if (!available) return;
	if (
		!window.confirm(`バージョン ${available.version} をインストールしてアプリを再起動しますか?`)
	) {
		return;
	}
	installing = true;
	try {
		// downloadAndInstall: download + 適用 + 自動再起動
		await available.downloadAndInstall((event) => {
			if (event.event === 'Started') {
				toastStore.add('ダウンロード開始', 'info');
			} else if (event.event === 'Finished') {
				toastStore.add('ダウンロード完了、再起動します', 'success');
			}
		});
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: 'アップデートのインストール' }, e), 'error');
		installing = false;
	}
}
</script>

<div class="space-y-3" data-testid="updater-settings">
	<div>
		<p class="text-sm font-medium text-[var(--ag-text-primary)]">アップデート</p>
		<p class="text-xs text-[var(--ag-text-muted)]">
			GitHub Releases から最新バージョンを確認・インストールできます。
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
			{checking ? '確認中...' : 'アップデート確認'}
		</Button>

		{#if available}
			<Button
				type="button"
				variant="default"
				size="sm"
				onclick={() => void handleInstall()}
				disabled={installing}
				data-testid="updater-install"
			>
				<Download class="h-3.5 w-3.5" />
				{installing ? 'インストール中...' : `v${available.version} を適用`}
			</Button>
		{/if}
	</div>

	{#if lastChecked}
		<p class="text-xs text-[var(--ag-text-muted)]">
			最終確認: {lastChecked.toLocaleString('ja-JP')}
		</p>
	{/if}

	{#if available}
		<div
			class="rounded border border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] px-3 py-2 text-xs"
			data-testid="updater-info"
		>
			<p class="font-medium text-[var(--ag-accent-text)]">新バージョン v{available.version}</p>
			{#if available.date}
				<p class="text-[var(--ag-text-muted)]">{available.date}</p>
			{/if}
			{#if available.body}
				<p class="mt-1 whitespace-pre-wrap text-[var(--ag-text-secondary)]">{available.body}</p>
			{/if}
		</div>
	{:else if lastChecked}
		<div class="flex items-center gap-1 text-xs text-[var(--ag-text-muted)]">
			<CheckCircle2 class="h-3.5 w-3.5 text-green-500" />
			最新バージョンを使用中です
		</div>
	{/if}
</div>
