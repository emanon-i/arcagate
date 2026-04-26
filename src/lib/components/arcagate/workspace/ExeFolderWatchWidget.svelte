<script lang="ts">
import { FolderOpen, MoreHorizontal } from '@lucide/svelte';
import { invoke } from '@tauri-apps/api/core';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import { launchItem } from '$lib/ipc/launch';
import { toastStore } from '$lib/state/toast.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
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

let candidatePopoverFor = $state<string | null>(null);

function resolveExe(entry: ExeFolderEntry): string | undefined {
	const override = config.item_overrides?.[entry.folderPath];
	if (override && entry.exeCandidates.some((c) => c.path === override)) {
		return override;
	}
	return entry.exeCandidates[0]?.path;
}

async function selectExe(entry: ExeFolderEntry, candPath: string) {
	if (!widget) return;
	const overrides = { ...(config.item_overrides ?? {}), [entry.folderPath]: candPath };
	await persistConfig({ ...config, item_overrides: overrides });
	candidatePopoverFor = null;
}

async function clearOverride(entry: ExeFolderEntry) {
	if (!widget) return;
	const overrides = { ...(config.item_overrides ?? {}) };
	delete overrides[entry.folderPath];
	await persistConfig({ ...config, item_overrides: overrides });
	candidatePopoverFor = null;
}

async function persistConfig(next: WidgetConfig) {
	if (!widget) return;
	try {
		await workspaceStore.updateWidgetConfig(widget.id, JSON.stringify(next));
	} catch (e: unknown) {
		toastStore.add(`設定保存に失敗: ${String(e)}`, 'error');
	}
}

function formatBytes(n: number): string {
	if (n < 1000) return `${n} B`;
	const units = ['KB', 'MB', 'GB'];
	let v = n / 1000;
	let i = 0;
	while (v >= 1000 && i < units.length - 1) {
		v /= 1000;
		i++;
	}
	return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
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
				{@const currentExe = resolveExe(entry)}
				{@const hasOverride = !!config.item_overrides?.[entry.folderPath]}
				<li class="relative flex items-center gap-1">
					<button
						type="button"
						class="flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[var(--ag-text-primary)] transition-[background-color] duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)]"
						aria-label="{entry.folderName} を起動"
						onclick={() => launchEntry(entry)}
					>
						<FolderOpen class="h-4 w-4 shrink-0 text-[var(--ag-text-muted)]" />
						<span class="min-w-0 flex-1 truncate">{entry.folderName}</span>
						<span class="shrink-0 text-[10px] {hasOverride ? 'text-[var(--ag-accent-text)]' : 'text-[var(--ag-text-faint)]'}">
							{entry.exeCandidates.length} exe{hasOverride ? ' ◉' : ''}
						</span>
					</button>
					{#if entry.exeCandidates.length > 1}
						<button
							type="button"
							class="rounded p-1 text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
							aria-label="{entry.folderName} の起動 exe を選ぶ"
							onclick={() => {
								candidatePopoverFor = candidatePopoverFor === entry.folderPath ? null : entry.folderPath;
							}}
						>
							<MoreHorizontal class="h-3 w-3" />
						</button>
					{/if}
					{#if candidatePopoverFor === entry.folderPath}
						<div
							role="menu"
							class="absolute right-0 top-full z-10 mt-1 w-72 max-w-full rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] p-1 shadow-[var(--ag-shadow-md)]"
						>
							{#each entry.exeCandidates as cand (cand.path)}
								<button
									type="button"
									role="menuitem"
									class="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs text-[var(--ag-text-primary)] hover:bg-[var(--ag-surface-3)]"
									onclick={() => void selectExe(entry, cand.path)}
								>
									<span class="min-w-0 flex-1 truncate">
										{cand.name}
									</span>
									<span class="shrink-0 text-[10px] text-[var(--ag-text-muted)]">
										{formatBytes(cand.sizeBytes)}{currentExe === cand.path ? ' ✓' : ''}
									</span>
								</button>
							{/each}
							{#if hasOverride}
								<button
									type="button"
									role="menuitem"
									class="mt-1 w-full rounded px-2 py-1.5 text-left text-[10px] text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-3)]"
									onclick={() => void clearOverride(entry)}
								>
									自動選択（最大サイズ）に戻す
								</button>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => (settingsOpen = false)} />
{/if}
