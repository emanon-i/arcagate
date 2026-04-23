<script lang="ts">
import { open, save } from '@tauri-apps/plugin-dialog';
import * as exportIpc from '$lib/ipc/export';
import { configStore } from '$lib/state/config.svelte';
import { itemStore } from '$lib/state/items.svelte';

let exporting = $state(false);
let importing = $state(false);
let message = $state<string | null>(null);

async function handleExport() {
	const path = await save({
		filters: [{ name: 'Arcagate Backup', extensions: ['json'] }],
		defaultPath: 'arcagate-backup.json',
	});
	if (!path) return;
	exporting = true;
	message = null;
	try {
		await exportIpc.exportJson(path);
		message = 'エクスポート完了';
	} catch (e) {
		message = `エクスポートエラー: ${e}`;
	} finally {
		exporting = false;
	}
}

async function handleImport() {
	const result = await open({
		filters: [{ name: 'Arcagate Backup', extensions: ['json'] }],
		multiple: false,
	});
	if (!result) return;
	const path = typeof result === 'string' ? result : result[0];
	importing = true;
	message = null;
	try {
		await exportIpc.importJson(path);
		await Promise.all([itemStore.loadItems(), itemStore.loadTags(), configStore.loadConfig()]);
		message = 'インポート完了';
	} catch (e) {
		message = `インポートエラー: ${e}`;
	} finally {
		importing = false;
	}
}
</script>

<div class="space-y-4">
  <h3 class="text-sm font-medium">データのバックアップ</h3>
  <p class="text-xs text-muted-foreground">アイテム・設定を JSON ファイルに保存します。起動ログは含まれません。</p>
  <div class="flex gap-2">
    <button
      onclick={handleExport}
      disabled={exporting || importing}
      class="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground transition-[background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] disabled:opacity-50 hover:opacity-90"
    >
      {exporting ? "エクスポート中..." : "エクスポート"}
    </button>
    <button
      onclick={handleImport}
      disabled={exporting || importing}
      class="rounded-md border px-3 py-1.5 text-sm transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] disabled:opacity-50 hover:bg-[var(--ag-surface-3)]"
    >
      {importing ? "インポート中..." : "インポート"}
    </button>
  </div>
  {#if message}
    <p class="text-sm text-muted-foreground">{message}</p>
  {/if}
</div>
