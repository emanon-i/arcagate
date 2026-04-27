<script lang="ts">
import { AppWindow, FolderOpen, MoreHorizontal, RotateCw } from '@lucide/svelte';
import { invoke } from '@tauri-apps/api/core';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';
import { getErrorMessage } from '$lib/utils/format-error';
import { formatIpcError } from '$lib/utils/ipc-error';
import { formatLaunchError } from '$lib/utils/launch-error';

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

// PH-490 + PH-492: race condition / 旧 cache 残存防止
// PH-500: retry でも同 effect を走らせるため retryNonce を依存に追加
let scanRequestId = 0;
let retryNonce = $state(0);
$effect(() => {
	const path = config.watch_path;
	const depth = config.scan_depth ?? 2;
	// PH-500: retryNonce を読んで retry trigger 化 (effect 再実行)
	const _retry = retryNonce;
	entries = [];
	scanError = null;
	if (!path) {
		scanning = false;
		return;
	}
	scanning = true;
	const myId = ++scanRequestId;
	invoke<ExeFolderEntry[]>('cmd_scan_exe_folders', { root: path, depth })
		.then((result) => {
			if (myId !== scanRequestId) return;
			entries = result;
		})
		.catch((e: unknown) => {
			if (myId !== scanRequestId) return;
			scanError = getErrorMessage(e);
			entries = [];
		})
		.finally(() => {
			if (myId === scanRequestId) scanning = false;
		});
});

let candidatePopoverFor = $state<string | null>(null);

// PH-500: ArrowUp/Down/Enter ナビ
let selectedIndex = $state(0);
let listEl = $state<HTMLUListElement | null>(null);

$effect(() => {
	const _len = entries.length;
	if (selectedIndex >= entries.length) selectedIndex = 0;
});

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
		toastStore.add(formatIpcError({ operation: '設定の保存' }, e), 'error');
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
	void invoke('cmd_open_path', { path: exePath })
		.then(() => toastStore.add(`${entry.folderName} を起動しました`, 'success'))
		.catch((e: unknown) => toastStore.add(formatLaunchError(entry.folderName, e), 'error'));
}

function retryScan() {
	retryNonce++;
}

function scrollSelectedIntoView() {
	if (!listEl) return;
	const el = listEl.querySelector<HTMLElement>(`[data-row-idx="${selectedIndex}"]`);
	el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function handleListKeydown(e: KeyboardEvent) {
	if (e.isComposing) return;
	if (entries.length === 0) return;
	if (e.key === 'ArrowDown') {
		e.preventDefault();
		selectedIndex = Math.min(selectedIndex + 1, entries.length - 1);
		scrollSelectedIntoView();
	} else if (e.key === 'ArrowUp') {
		e.preventDefault();
		selectedIndex = Math.max(selectedIndex - 1, 0);
		scrollSelectedIntoView();
	} else if (e.key === 'Enter') {
		const sel = entries[selectedIndex];
		if (sel) {
			e.preventDefault();
			void launchEntry(sel);
		}
	} else if (e.key === 'Escape') {
		if (candidatePopoverFor !== null) {
			e.preventDefault();
			candidatePopoverFor = null;
		}
	}
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

<WidgetShell title={config.title || 'Exe Folders'} icon={AppWindow} {menuItems}>
	<!-- PH-500: container query で widget サイズ別 layout
		- S (~150px width): icon のみ、count badge 隠す
		- M (200-300px): icon + name (truncate)
		- L (300px+): icon + name + count badge -->
	<div
		class="exe-folder-container flex h-full flex-col gap-2"
		role="region"
		aria-label="Exe フォルダ監視"
	>
		{#if !config.watch_path}
			<!-- 空 state: centered button (PH-500) -->
			<div class="flex flex-1 flex-col items-center justify-center gap-2 px-2 py-4 text-center">
				<AppWindow class="h-8 w-8 text-[var(--ag-text-faint)]" />
				<p class="text-ag-sm font-medium text-[var(--ag-text-secondary)]">
					監視フォルダ未設定
				</p>
				<p class="max-w-[18rem] text-ag-xs text-[var(--ag-text-muted)]">
					監視ルートを選ぶと、サブフォルダの exe を自動で表示します。
				</p>
				{#if widget}
					<button
						type="button"
						class="mt-1 rounded-[var(--ag-radius-input)] bg-[var(--ag-accent-bg)] px-3 py-1.5 text-ag-xs text-[var(--ag-accent-text)] transition-[background-color] duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-accent-active-bg)]"
						data-testid="exe-folder-empty-set-btn"
						onclick={() => {
							settingsOpen = true;
						}}
					>
						監視フォルダを設定
					</button>
				{/if}
			</div>
		{:else if scanning}
			<!-- loading state: subtle pulse (PH-500) -->
			<div class="flex flex-1 flex-col items-center justify-center gap-2 px-2 py-4 text-center">
				<AppWindow class="h-7 w-7 animate-pulse text-[var(--ag-text-faint)] motion-reduce:animate-none" />
				<p class="text-ag-xs text-[var(--ag-text-muted)]">スキャン中...</p>
			</div>
		{:else if scanError}
			<!-- error state: retry button (PH-500) -->
			<div class="flex flex-1 flex-col items-center justify-center gap-2 px-2 py-4 text-center">
				<p class="text-ag-sm font-medium text-[var(--ag-text-error)]">スキャン失敗</p>
				<p class="max-w-[18rem] truncate text-ag-xs text-[var(--ag-text-muted)]" title={scanError}>
					{scanError}
				</p>
				<button
					type="button"
					class="mt-1 inline-flex items-center gap-1 rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-1.5 text-ag-xs text-[var(--ag-text-secondary)] transition-[background-color] duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)]"
					data-testid="exe-folder-retry-btn"
					onclick={retryScan}
				>
					<RotateCw class="h-3 w-3" />
					再試行
				</button>
			</div>
		{:else if entries.length === 0}
			<div class="flex flex-1 flex-col items-center justify-center gap-2 px-2 py-4 text-center">
				<FolderOpen class="h-7 w-7 text-[var(--ag-text-faint)]" />
				<p class="text-ag-xs text-[var(--ag-text-muted)]">
					exe を含むサブフォルダがありません
				</p>
			</div>
		{:else}
			<!-- PH-500: ArrowUp/Down/Enter ナビ対応の list -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<ul
				class="space-y-1 outline-none"
				bind:this={listEl}
				role="listbox"
				aria-label="Exe フォルダ一覧"
				tabindex="0"
				onkeydown={handleListKeydown}
			>
				{#each entries as entry, idx (entry.folderPath)}
					{@const currentExe = resolveExe(entry)}
					{@const hasOverride = !!config.item_overrides?.[entry.folderPath]}
					{@const isSelected = idx === selectedIndex}
					<li class="relative flex items-center gap-1" data-row-idx={idx}>
						<button
							type="button"
							class="flex flex-1 min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-ag-sm text-[var(--ag-text-primary)] transition-[background-color] duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)] {isSelected
								? 'bg-[var(--ag-surface-3)]'
								: ''}"
							role="option"
							aria-selected={isSelected}
							aria-label="{entry.folderName} を起動"
							data-testid="exe-folder-row"
							onclick={() => {
								selectedIndex = idx;
								void launchEntry(entry);
							}}
						>
							<AppWindow class="h-4 w-4 shrink-0 text-[var(--ag-text-muted)]" />
							<span class="min-w-0 flex-1 truncate" title={entry.folderName}>{entry.folderName}</span>
							<span
								class="exe-folder-badge shrink-0 text-[10px] {hasOverride
									? 'text-[var(--ag-accent-text)]'
									: 'text-[var(--ag-text-faint)]'}"
							>
								{entry.exeCandidates.length} exe{hasOverride ? ' ◉' : ''}
							</span>
						</button>
						{#if entry.exeCandidates.length > 1}
							<button
								type="button"
								class="exe-folder-more shrink-0 rounded p-1 text-[var(--ag-text-muted)] transition-[background-color] duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)]"
								aria-label="{entry.folderName} の起動 exe を選ぶ"
								onclick={() => {
									candidatePopoverFor =
										candidatePopoverFor === entry.folderPath ? null : entry.folderPath;
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
										class="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-ag-xs text-[var(--ag-text-primary)] hover:bg-[var(--ag-surface-3)]"
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
	</div>
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => (settingsOpen = false)} />
{/if}

<style>
.exe-folder-container {
	container-type: inline-size;
}
/* S サイズ (~150px width 以下): exe count badge を隠す、name を主役に */
@container (max-width: 200px) {
	.exe-folder-badge {
		display: none;
	}
}
</style>
