<script lang="ts">
import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { getErrorMessage } from '$lib/utils/format-error';

/**
 * U-5: ImageScrap の設定 (画像 path 選択 + APPDATA コピー)。
 *
 * file picker で選んだ source path を `cmd_save_image_scrap` で APPDATA/image-scraps/<uuid>.<ext>
 * にコピー、 widget config.path には保存後 path を保存。 asset protocol scope と整合。
 */
let { config = $bindable<{ path?: string }>({}) } = $props();
let saving = $state(false);

async function pickFile(): Promise<void> {
	const selected = await openDialog({
		multiple: false,
		filters: [
			{
				name: t('widgets.image_scrap.filter_image'),
				extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'],
			},
		],
	});
	if (!selected) return;
	saving = true;
	try {
		const saved = await invoke<string>('cmd_save_image_scrap', { sourcePath: selected as string });
		config = { ...config, path: saved };
	} catch (e) {
		toastStore.add(t('toast.image_save_failed', { error: getErrorMessage(e) }), 'error');
	} finally {
		saving = false;
	}
}
</script>

<div class="space-y-2">
	<div class="text-xs font-medium text-[var(--ag-text-secondary)]">{t('widgets.image_scrap.file_label')}</div>
	<div class="flex items-center gap-2">
		<input
			type="text"
			class="min-w-0 flex-1 rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2 py-1 text-xs text-[var(--ag-text-primary)] outline-none focus:border-[var(--ag-accent)]"
			placeholder={t('widgets.image_scrap.path_placeholder')}
			value={config.path ?? ''}
			readonly
		/>
		<Button type="button" variant="outline" size="sm" disabled={saving} onclick={() => void pickFile()}>
			{saving ? t('widgets.image_scrap.saving') : t('widgets.common.folder.pick_button')}
		</Button>
	</div>
	<p class="text-xs text-[var(--ag-text-muted)]">
		{t('widgets.image_scrap.format_hint')}
	</p>
</div>
