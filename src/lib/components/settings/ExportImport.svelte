<script lang="ts">
import { open, save } from '@tauri-apps/plugin-dialog';
import { Button } from '$lib/components/ui/button';
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
  <!-- audit 2026-05-14 rank 11 phase 2: ExportImport の 2 raw button を shadcn Button に migration。
       「エクスポート」 = primary (= rubric (a))、 「インポート」 = secondary (= (b))。 -->
  <div class="flex gap-2">
    <Button
      type="button"
      variant="default"
      size="sm"
      onclick={handleExport}
      disabled={exporting || importing}
    >
      {exporting ? "エクスポート中..." : "エクスポート"}
    </Button>
    <Button
      type="button"
      variant="outline"
      size="sm"
      onclick={handleImport}
      disabled={exporting || importing}
    >
      {importing ? "インポート中..." : "インポート"}
    </Button>
  </div>
  {#if message}
    <p class="text-sm text-muted-foreground">{message}</p>
  {/if}
</div>
