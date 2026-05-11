<script lang="ts">
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { Button } from '$lib/components/ui/button';

/**
 * U-6: FilePreview の設定 (ファイル path 選択)。
 */
let { config = $bindable<{ path?: string }>({}) } = $props();

async function pickFile(): Promise<void> {
	const selected = await openDialog({
		multiple: false,
		filters: [
			{
				name: 'テキスト',
				extensions: ['md', 'txt', 'markdown', 'log', 'json', 'yaml', 'yml', 'toml', 'csv'],
			},
			{ name: 'すべて', extensions: ['*'] },
		],
	});
	if (selected) {
		config = { ...config, path: selected as string };
	}
}
</script>

<div class="space-y-2">
	<div class="text-xs font-medium text-[var(--ag-text-secondary)]">ファイル</div>
	<div class="flex items-center gap-2">
		<input
			type="text"
			class="min-w-0 flex-1 rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2 py-1 text-xs text-[var(--ag-text-primary)] outline-none focus:border-[var(--ag-accent)]"
			placeholder="テキストファイルのパス"
			value={config.path ?? ''}
			oninput={(e) => (config = { ...config, path: (e.currentTarget as HTMLInputElement).value })}
		/>
		<Button type="button" variant="outline" size="sm" onclick={() => void pickFile()}>選択</Button>
	</div>
	<p class="text-xs text-[var(--ag-text-muted)]">
		md / txt / markdown / json / yaml / toml / csv / log に対応。 Markdown の YAML フロントマターは別領域に表示。
	</p>
</div>
