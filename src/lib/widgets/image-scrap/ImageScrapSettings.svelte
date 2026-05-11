<script lang="ts">
import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { Button } from '$lib/components/ui/button';
import { toastStore } from '$lib/state/toast.svelte';

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
		filters: [{ name: '画像', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'] }],
	});
	if (!selected) return;
	saving = true;
	try {
		const saved = await invoke<string>('cmd_save_image_scrap', { sourcePath: selected as string });
		config = { ...config, path: saved };
	} catch (e) {
		toastStore.add(`画像の保存に失敗: ${String(e)}`, 'error');
	} finally {
		saving = false;
	}
}
</script>

<div class="space-y-2">
	<div class="text-xs font-medium text-[var(--ag-text-secondary)]">画像ファイル</div>
	<div class="flex items-center gap-2">
		<input
			type="text"
			class="min-w-0 flex-1 rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2 py-1 text-xs text-[var(--ag-text-primary)] outline-none focus:border-[var(--ag-accent)]"
			placeholder="画像ファイルのパス"
			value={config.path ?? ''}
			readonly
		/>
		<Button type="button" variant="outline" size="sm" disabled={saving} onclick={() => void pickFile()}>
			{saving ? '保存中...' : '選択'}
		</Button>
	</div>
	<p class="text-xs text-[var(--ag-text-muted)]">
		png / jpg / gif / webp / svg / bmp に対応。
	</p>
</div>
