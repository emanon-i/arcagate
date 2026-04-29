<script lang="ts">
/**
 * PH-issue-026 (Issue 23): ExeFolderSettings polish — folder picker を shadcn Button に統一。
 * PH-issue-039 / 検収項目 #13 + #15: Clear button + description (120 文字制限) を Projects と統一。
 */
import { X } from '@lucide/svelte';
import { open } from '@tauri-apps/plugin-dialog';
import { Button } from '$lib/components/ui/button';

const DESCRIPTION_MAX = 120;

interface Props {
	config: {
		watch_path?: string;
		scan_depth?: number;
		title?: string;
		description?: string;
		item_overrides?: Record<string, string>;
	};
}

let { config = $bindable() }: Props = $props();

let watchPath = $derived(config.watch_path ?? '');
let scanDepth = $derived(config.scan_depth ?? 2);
let exeFolderTitle = $derived(config.title ?? '');
let exeDescription = $derived(config.description ?? '');

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

// PH-issue-039 / 検収項目 #13: Clear (Projects と統一)
function handleClearFolder() {
	config = { ...config, watch_path: '' };
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
		{#if watchPath}
			<!-- PH-issue-039 / 検収項目 #13: Clear button (Projects と統一) -->
			<Button
				type="button"
				variant="ghost"
				size="sm"
				class="text-destructive hover:bg-destructive/10 hover:text-destructive"
				onclick={handleClearFolder}
				aria-label="監視フォルダを解除"
			>
				<X class="h-3.5 w-3.5" />
			</Button>
		{/if}
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

<div class="space-y-1">
	<!-- PH-issue-039 / 検収項目 #15: 説明欄 (120 文字制限) を ExeFolder にも (Projects と統一) -->
	<div class="flex items-center justify-between">
		<label
			class="text-sm font-medium text-[var(--ag-text-primary)]"
			for="ws-exe-description"
		>説明 (任意)</label>
		<span
			class="text-xs tabular-nums {exeDescription.length >= DESCRIPTION_MAX
				? 'text-[var(--ag-error-text)]'
				: exeDescription.length >= DESCRIPTION_MAX - 20
					? 'text-[var(--ag-warm-text)]'
					: 'text-[var(--ag-text-muted)]'}"
		>{exeDescription.length}/{DESCRIPTION_MAX}</span>
	</div>
	<input
		id="ws-exe-description"
		type="text"
		autocomplete="off"
		placeholder="このウィジェットの目的"
		maxlength={DESCRIPTION_MAX}
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={exeDescription}
		oninput={(e) => {
			config = { ...config, description: (e.currentTarget as HTMLInputElement).value };
		}}
	/>
</div>
