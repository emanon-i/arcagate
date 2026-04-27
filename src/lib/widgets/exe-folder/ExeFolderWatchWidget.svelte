<script lang="ts">
import { AppWindow, MoreHorizontal } from '@lucide/svelte';
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

// PH-490 + PH-492: watch_path / scan_depth 変更時の race condition / 旧 cache 残存問題 fix
// - effect 開始時に entries を即時 clear (path 変更で旧 entries が残るのを防ぐ)
// - request id で stale response を破棄 (path 高速切替時)
let scanRequestId = 0;
$effect(() => {
	const path = config.watch_path;
	const depth = config.scan_depth ?? 2;
	// PH-490: path 切替時に旧 entries を即時 clear (混在表示防止)
	// PH-492: 新規配置 widget でも config 未設定なら空 state 確保
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
			if (myId !== scanRequestId) return; // PH-490: stale response 破棄
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

// PH-500: ArrowUp/Down + Enter で row 選択 + 起動 (FileSearchWidget と同 UX)
let selectedIndex = $state(0);
let listEl = $state<HTMLUListElement | null>(null);

// entries 変更で selectedIndex 0 reset (out-of-range 防止)
$effect(() => {
	const _len = entries.length;
	selectedIndex = 0;
});

function handleListKeydown(e: KeyboardEvent) {
	if (e.isComposing) return; // IME 中は無視
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
	} else if (e.key === 'Escape' && candidatePopoverFor !== null) {
		e.preventDefault();
		candidatePopoverFor = null;
	}
}

function scrollSelectedIntoView() {
	if (!listEl) return;
	const el = listEl.querySelector<HTMLElement>(`[data-row-idx="${selectedIndex}"]`);
	el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

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
	// path 直起動: DB 経由しない（cmd_open_path で OS デフォルト起動）
	void invoke('cmd_open_path', { path: exePath })
		.then(() => toastStore.add(`${entry.folderName} を起動しました`, 'success'))
		.catch((e: unknown) => toastStore.add(formatLaunchError(entry.folderName, e), 'error'));
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
	<div class="exe-folder-container flex h-full flex-col">
		{#if !config.watch_path}
			<div
				class="rounded-md border border-dashed border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2 py-2 text-ag-sm text-[var(--ag-text-muted)]"
				data-testid="exe-folder-empty-state"
			>
				<p class="mb-0.5 font-medium text-[var(--ag-text-secondary)]">
					監視フォルダを設定してください
				</p>
				<p class="text-ag-xs">
					設定モーダルで監視ルートを選ぶと、サブフォルダの exe が自動で表示されます。
				</p>
			</div>
		{:else if scanning}
			<p class="text-ag-sm text-[var(--ag-text-muted)] animate-pulse" aria-live="polite">
				スキャン中...
			</p>
		{:else if scanError}
			<p class="text-ag-sm text-[var(--ag-text-error)]" data-testid="exe-folder-error">
				エラー: {scanError}
			</p>
		{:else if entries.length === 0}
			<p class="text-ag-sm text-[var(--ag-text-muted)]">
				指定フォルダ内に exe を含むサブフォルダがありません。
			</p>
		{:else}
			<!--
				PH-500: ArrowUp/Down + Enter ナビゲーション。
				role="listbox" + tabindex で keyboard focus 可、aria-activedescendant で SR 通知。
			-->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<ul
				class="exe-folder-list space-y-1"
				role="listbox"
				tabindex="0"
				aria-label="exe フォルダ一覧"
				aria-activedescendant={entries.length > 0 ? `exe-folder-row-${selectedIndex}` : undefined}
				bind:this={listEl}
				onkeydown={handleListKeydown}
			>
				{#each entries as entry, idx (entry.folderPath)}
					{@const currentExe = resolveExe(entry)}
					{@const hasOverride = !!config.item_overrides?.[entry.folderPath]}
					{@const isSelected = idx === selectedIndex}
					<li
						class="relative flex items-center gap-1"
						id="exe-folder-row-{idx}"
						role="option"
						aria-selected={isSelected}
						data-row-idx={idx}
					>
						<button
							type="button"
							class="flex flex-1 min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-ag-sm text-[var(--ag-text-primary)] transition-[background-color] duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)] {isSelected
								? 'bg-[var(--ag-surface-3)]'
								: ''}"
							aria-label="{entry.folderName} を起動"
							onclick={() => launchEntry(entry)}
						>
							<AppWindow class="h-4 w-4 shrink-0 text-[var(--ag-text-muted)]" />
							<span class="min-w-0 flex-1 truncate">{entry.folderName}</span>
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
								class="shrink-0 rounded p-1 text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
								aria-label="{entry.folderName} の起動 exe を選ぶ"
								aria-haspopup="menu"
								aria-expanded={candidatePopoverFor === entry.folderPath}
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
/*
	PH-500: container query で widget サイズに応じて exe count badge を S サイズで隠す。
	S (< 180px): icon + name のみ (count badge 非表示)
	M/L: icon + name + count badge
*/
.exe-folder-container {
	container-type: inline-size;
}
@container (max-width: 180px) {
	.exe-folder-badge {
		display: none;
	}
}
</style>
