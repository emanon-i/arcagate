<script lang="ts">
/**
 * PH-issue-026 (Issue 23): ExeFolderSettings polish — folder picker を shadcn Button に統一。
 */
import { open } from '@tauri-apps/plugin-dialog';
import { Button } from '$lib/components/ui/button';

interface Props {
	config: {
		watch_path?: string;
		scan_depth?: number;
		title?: string;
		item_overrides?: Record<string, string>;
	};
}

let { config = $bindable() }: Props = $props();

let watchPath = $derived(config.watch_path ?? '');
let scanDepth = $derived(config.scan_depth ?? 2);
let exeFolderTitle = $derived(config.title ?? '');

async function handlePickFolder() {
	const selected = await open({
		directory: true,
		multiple: false,
		title: '監視するフォルダを選択',
	});
	if (selected && !Array.isArray(selected)) {
		config = { ...config, watch_path: selected };
	}
}
</script>

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-watch-path">監視フォルダ</label>
	<div class="flex gap-2">
		<input
			id="ws-watch-path"
			type="text"
			autocomplete="off"
			placeholder="例: D:\Tools"
			class="min-w-0 flex-1 rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
			value={watchPath}
			oninput={(e) => {
				config = { ...config, watch_path: (e.currentTarget as HTMLInputElement).value };
			}}
		/>
		<Button type="button" variant="outline" size="sm" onclick={handlePickFolder}>選択</Button>
	</div>
</div>
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-scan-depth">スキャン階層 (1〜3)</label>
	<input
		id="ws-scan-depth"
		type="number"
		min="1"
		max="3"
		autocomplete="off"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={scanDepth}
		onchange={(e) => {
			config = {
				...config,
				scan_depth: Math.max(
					1,
					Math.min(3, Number((e.currentTarget as HTMLInputElement).value) || 2),
				),
			};
		}}
	/>
</div>
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-exe-title">タイトル</label>
	<input
		id="ws-exe-title"
		type="text"
		autocomplete="off"
		placeholder="Exe Folders"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={exeFolderTitle}
		oninput={(e) => {
			config = { ...config, title: (e.currentTarget as HTMLInputElement).value };
		}}
	/>
</div>
