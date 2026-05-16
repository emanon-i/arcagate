<script lang="ts">
import { open, save } from '@tauri-apps/plugin-dialog';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';
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
		message = t('settings.export_import.export_done');
	} catch (e) {
		message = t('settings.export_import.export_error', { error: String(e) });
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
		message = t('settings.export_import.import_done');
	} catch (e) {
		message = t('settings.export_import.import_error', { error: String(e) });
	} finally {
		importing = false;
	}
}
</script>

<div class="space-y-4">
  <h3 class="text-sm font-medium">{t('settings.export_import.heading')}</h3>
  <p class="text-xs text-muted-foreground">{t('settings.export_import.desc')}</p>
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
      {exporting ? t('settings.export_import.exporting') : t('settings.export_import.export_button')}
    </Button>
    <Button
      type="button"
      variant="outline"
      size="sm"
      onclick={handleImport}
      disabled={exporting || importing}
    >
      {importing ? t('settings.export_import.importing') : t('settings.export_import.import_button')}
    </Button>
  </div>
  {#if message}
    <p class="text-sm text-muted-foreground">{message}</p>
  {/if}
</div>
