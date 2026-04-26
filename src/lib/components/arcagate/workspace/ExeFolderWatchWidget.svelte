<script lang="ts">
import { FolderOpen } from '@lucide/svelte';
import { invoke } from '@tauri-apps/api/core';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import { launchItem } from '$lib/ipc/launch';
import { toastStore } from '$lib/state/toast.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';

interface Props {
	widget?: WorkspaceWidget;
}

let { widget }: Props = $props();
let settingsOpen = $state(false);

interface ExeCandidate {
	path: string;
	sizeBytes: number;
	name: string;
}

interface ExeFolderEntry {
	folderPath: string;
	folderName: string;
	exeCandidates: ExeCandidate[];
	iconPath?: string;
}

interface WidgetConfig {
	watch_path?: string;
	scan_depth?: number;
	title?: string;
	item_overrides?: Record<string, string>;
}

let config = $derived.by<WidgetConfig>(() => {
	if (!widget?.config) return {};
	try {
		return JSON.parse(widget.config) as WidgetConfig;
	} catch {
		return {};
	}
});

let entries = $state<ExeFolderEntry[]>([]);
let scanning = $state(false);
let scanError = $state<string | null>(null);

// Lazy fetch: watch_path / scan_depth が設定されたとき + 変化時に scan
$effect(() => {
	const path = config.watch_path;
	const depth = config.scan_depth ?? 2;
	if (!path) {
		entries = [];
		return;
	}
	scanning = true;
	scanError = null;
	invoke<ExeFolderEntry[]>('cmd_scan_exe_folders', { root: path, depth })
		.then((result) => {
			entries = result;
		})
		.catch((e: unknown) => {
			scanError = String(e);
			entries = [];
		})
		.finally(() => {
			scanning = false;
		});
});

function resolveExe(entry: ExeFolderEntry): string | undefined {
	const override = config.item_overrides?.[entry.folderPath];
	if (override && entry.exeCandidates.some((c) => c.path === override)) {
		return override;
	}
	return entry.exeCandidates[0]?.path;
}

async function launchEntry(entry: ExeFolderEntry) {
	const exePath = resolveExe(entry);
	if (!exePath) {
		toastStore.add(`${entry.folderName}: 起動可能な exe が見つかりません`, 'error');
		return;
	}
	// path 直起動: 仮想 item id でなく直接 spawn
	// （Library 経由でない、起動カウンタ未記録は仕様、PH-304 で記録）
	void launchItem(`exe-folder:${exePath}`)
		.then(() => toastStore.add(`${entry.folderName} を起動しました`, 'success'))
		.catch((e: unknown) => toastStore.add(`起動に失敗しました: ${String(e)}`, 'error'));
}

let menuItems = $derived(
	widget
		? [
				{
					label: '設定',
					onclick: () => {
						settingsOpen = true;
					},
				},
			]
		: [],
);
</script>

<WidgetShell title={config.title || 'Exe Folders'} icon={FolderOpen} {menuItems}>
	{#if !config.watch_path}
		<p class="text-sm text-[var(--ag-text-muted)]">
			設定からフォルダと階層を指定してください。
		</p>
	{:else if scanning}
		<p class="text-sm text-[var(--ag-text-muted)]">スキャン中...</p>
	{:else if scanError}
		<p class="text-sm text-[var(--ag-text-error)]">エラー: {scanError}</p>
	{:else if entries.length === 0}
		<p class="text-sm text-[var(--ag-text-muted)]">
			指定フォルダ内に exe を含むサブフォルダがありません。
		</p>
	{:else}
		<ul class="space-y-1">
			{#each entries as entry (entry.folderPath)}
				<li class="flex items-center gap-2">
					<button
						type="button"
						class="flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[var(--ag-text-primary)] transition-[background-color] duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)]"
						aria-label="{entry.folderName} を起動"
						onclick={() => launchEntry(entry)}
					>
						<FolderOpen class="h-4 w-4 shrink-0 text-[var(--ag-text-muted)]" />
						<span class="min-w-0 flex-1 truncate">{entry.folderName}</span>
						<span class="shrink-0 text-[10px] text-[var(--ag-text-faint)]">
							{entry.exeCandidates.length} exe
						</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => (settingsOpen = false)} />
{/if}
