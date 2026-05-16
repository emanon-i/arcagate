<script lang="ts">
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';

/**
 * U-6: FilePreview の設定 (ファイル path 選択)。
 */
let { config = $bindable<{ path?: string }>({}) } = $props();

async function pickFile(): Promise<void> {
	const selected = await openDialog({
		multiple: false,
		filters: [
			{
				name: t('widgets.file_preview.filter_text'),
				extensions: ['md', 'txt', 'markdown', 'log', 'json', 'yaml', 'yml', 'toml', 'csv'],
			},
			{ name: t('widgets.file_preview.filter_all'), extensions: ['*'] },
		],
	});
	if (selected) {
		config = { ...config, path: selected as string };
	}
}
</script>

<div class="space-y-2">
	<div class="text-xs font-medium text-[var(--ag-text-secondary)]">{t('widgets.file_preview.file_label')}</div>
	<div class="flex items-center gap-2">
		<input
			type="text"
			class="min-w-0 flex-1 rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2 py-1 text-xs text-[var(--ag-text-primary)] outline-none focus:border-[var(--ag-accent)]"
			placeholder={t('widgets.file_preview.path_placeholder')}
			value={config.path ?? ''}
			oninput={(e) => (config = { ...config, path: (e.currentTarget as HTMLInputElement).value })}
		/>
		<Button type="button" variant="outline" size="sm" onclick={() => void pickFile()}>{t('widgets.common.folder.pick_button')}</Button>
	</div>
	<p class="text-xs text-[var(--ag-text-muted)]">
		{t('widgets.file_preview.format_hint')}
	</p>
</div>
