<script lang="ts">
import { X } from '@lucide/svelte';
import { open } from '@tauri-apps/plugin-dialog';

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

// PH-490b: 監視 path を完全クリア (未設定状態に戻す)
// path A → unset → path B の遷移をサポート、ウィジェットは「監視フォルダを設定してください」zero state に
function clearWatchPath() {
	const next = { ...config };
	delete next.watch_path;
	delete next.item_overrides; // path クリア時に override も clear (dead reference 排除)
	config = next;
}
</script>

<div class="space-y-1">
	<label class="text-ag-sm font-medium text-[var(--ag-text-primary)]" for="ws-watch-path">監視フォルダ</label>
	<div class="flex gap-2">
		<input
			id="ws-watch-path"
			type="text"
			autocomplete="off"
			placeholder="例: D:\Tools"
			class="flex-1 rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-ag-sm text-[var(--ag-text-primary)]"
			value={watchPath}
			oninput={(e) => {
				config = { ...config, watch_path: (e.currentTarget as HTMLInputElement).value };
			}}
		/>
		<button
			type="button"
			class="rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-2 text-ag-sm text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]"
			onclick={async () => {
				const selected = await open({
					directory: true,
					multiple: false,
					title: '監視するフォルダを選択',
				});
				if (selected && !Array.isArray(selected)) {
					config = { ...config, watch_path: selected };
				}
			}}
		>
			参照
		</button>
		<!-- PH-490b: 未設定状態に戻す Clear button (path 設定済の時のみ表示) -->
		{#if watchPath}
			<button
				type="button"
				class="rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2 py-2 text-[var(--ag-text-muted)] transition-colors hover:bg-destructive hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
				aria-label="監視フォルダをクリア"
				title="監視フォルダをクリア (未設定状態に戻す)"
				onclick={clearWatchPath}
			>
				<X class="h-4 w-4" />
			</button>
		{/if}
	</div>
	{#if watchPath}
		<p class="text-ag-xs text-[var(--ag-text-muted)]">
			クリアボタンで未設定状態に戻せます (widget 内容も即リセット)
		</p>
	{/if}
</div>
<div class="space-y-1">
	<label class="text-ag-sm font-medium text-[var(--ag-text-primary)]" for="ws-scan-depth">スキャン階層 (1〜3)</label>
	<input
		id="ws-scan-depth"
		type="number"
		min="1"
		max="3"
		autocomplete="off"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-ag-sm text-[var(--ag-text-primary)]"
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
	<label class="text-ag-sm font-medium text-[var(--ag-text-primary)]" for="ws-exe-title">タイトル</label>
	<input
		id="ws-exe-title"
		type="text"
		autocomplete="off"
		placeholder="Exe Folders"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-ag-sm text-[var(--ag-text-primary)]"
		value={exeFolderTitle}
		oninput={(e) => {
			config = { ...config, title: (e.currentTarget as HTMLInputElement).value };
		}}
	/>
</div>
