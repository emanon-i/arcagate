<script lang="ts">
import {
	AppWindow,
	ArrowDown,
	ArrowUp,
	FolderOpen,
	MoreHorizontal,
	Settings,
} from '@lucide/svelte';
import { invoke } from '@tauri-apps/api/core';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import EmptyState from '$lib/components/common/EmptyState.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';
import { getErrorMessage } from '$lib/utils/format-error';
import { formatIpcError } from '$lib/utils/ipc-error';
import { formatLaunchError } from '$lib/utils/launch-error';
import { widgetMenuItems } from '../_shared/menu-items';

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
	/** PH-issue-038 / 検収項目 #20: バックエンドが返す mtime (ms epoch、無ければ 0)。 */
	mtimeMs?: number;
}

type SortField = 'name' | 'mtime';
type SortOrder = 'asc' | 'desc';

interface WidgetConfig {
	watch_path?: string;
	scan_depth?: number;
	title?: string;
	/**
	 * 4/30 user 検収 #14: ExeFolderSettings で description を保存していたが、
	 * Widget 本体の WidgetConfig に未定義で表示されていなかった (silent dead field)。
	 * 120 文字制限の説明文を widget header 直下に line-clamp-2 で表示する。
	 */
	description?: string;
	item_overrides?: Record<string, string>;
	/** PH-issue-038 / 検収項目 #20: 並び替え設定。 */
	sort_field?: SortField;
	sort_order?: SortOrder;
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

// PH-issue-038 / 検収項目 #20: sort 適用済 entries (元 entries は immutable、表示のみ並べ替え)
let sortField = $derived<SortField>(config.sort_field ?? 'name');
let sortOrder = $derived<SortOrder>(config.sort_order ?? 'asc');
let sortedEntries = $derived.by(() => {
	const list = [...entries];
	const dir = sortOrder === 'asc' ? 1 : -1;
	if (sortField === 'name') {
		list.sort((a, b) => dir * a.folderName.localeCompare(b.folderName, 'ja'));
	} else {
		// mtime descending = 新しい順 (asc=古い順)
		list.sort((a, b) => dir * ((a.mtimeMs ?? 0) - (b.mtimeMs ?? 0)));
	}
	return list;
});

async function setSort(field: SortField) {
	const nextOrder: SortOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
	await persistConfig({ ...config, sort_field: field, sort_order: nextOrder });
}
// PH-issue-017: race condition fix — 古い path の async 結果が新 path に
// 書き戻されないよう request id で stale response を破棄する。
let scanRequestId = 0;

// Lazy fetch: watch_path / scan_depth が設定されたとき + 変化時に scan
$effect(() => {
	const path = config.watch_path;
	const depth = config.scan_depth ?? 2;
	// 派生 state を即時 clear (path 変更 / unset 直後に旧 entries が残らない)。
	entries = [];
	scanError = null;
	if (!path) {
		scanning = false;
		return;
	}
	const myId = ++scanRequestId;
	scanning = true;
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
			if (myId !== scanRequestId) return;
			scanning = false;
		});
});

let candidatePopoverFor = $state<string | null>(null);

// PH-widget-polish: popover を開いた時、Escape / 外側 click で close。
// click outside は document level の pointerdown を監視、popover element 内を除外。
$effect(() => {
	if (candidatePopoverFor === null) return;
	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			candidatePopoverFor = null;
		}
	}
	function onPointerDown(e: PointerEvent) {
		const target = e.target as HTMLElement | null;
		if (!target) return;
		// popover 内 (role="menu") か popover を開いた button (aria-haspopup) は無視
		if (target.closest('[role="menu"]') || target.closest('[data-popover-trigger="exe-cands"]')) {
			return;
		}
		candidatePopoverFor = null;
	}
	document.addEventListener('keydown', onKeyDown);
	document.addEventListener('pointerdown', onPointerDown);
	return () => {
		document.removeEventListener('keydown', onKeyDown);
		document.removeEventListener('pointerdown', onPointerDown);
	};
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
	// path 直起動: DB 経由しない（cmd_open_path で OS デフォルト起動）
	void invoke('cmd_open_path', { path: exePath })
		.then(() => toastStore.add(`${entry.folderName} を起動しました`, 'success'))
		.catch((e: unknown) => toastStore.add(formatLaunchError(entry.folderName, e), 'error'));
}

let menuItems = $derived(widgetMenuItems(widget, () => (settingsOpen = true)));
</script>

<WidgetShell title={config.title || 'Exe Folders'} icon={AppWindow} {menuItems}>
	{#if config.description}
		<!-- 4/30 user 検収 #14: ExeFolderSettings.description を widget body に表示 (line-clamp-2)。 -->
		<p class="mb-2 line-clamp-2 text-xs text-[var(--ag-text-muted)]">{config.description}</p>
	{/if}
	{#if !config.watch_path}
		<!-- PH-issue-022: 共通 EmptyState component で統一 (P12 整合性、§7 Do/Don't) -->
		<EmptyState
			icon={FolderOpen}
			title="監視フォルダを設定してください"
			description="設定モーダルで監視ルートを選ぶと、サブフォルダの exe が自動で表示されます。"
			action={{
				label: '設定を開く',
				icon: Settings,
				onClick: () => (settingsOpen = true),
			}}
			testId="exe-folder-empty-state"
		/>
	{:else if scanning}
		<p class="text-sm text-[var(--ag-text-muted)]">スキャン中...</p>
	{:else if scanError}
		<p class="text-sm text-[var(--ag-text-error)]">エラー: {scanError}</p>
	{:else if entries.length === 0}
		<p class="text-sm text-[var(--ag-text-muted)]">
			指定フォルダ内に exe を含むサブフォルダがありません。
		</p>
	{:else}
		<!-- PH-issue-038 / 検収項目 #20: 並び替え toolbar。clicking same field toggles asc/desc。 -->
		<div class="mb-2 flex shrink-0 items-center gap-1 border-b border-[var(--ag-border)] pb-1.5 text-xs">
			<span class="text-[var(--ag-text-muted)]">並び替え:</span>
			<button
				type="button"
				class="flex items-center gap-0.5 rounded px-1.5 py-0.5 transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)] {sortField ===
				'name'
					? 'bg-[var(--ag-surface-3)] text-[var(--ag-text-primary)]'
					: 'text-[var(--ag-text-secondary)]'}"
				onclick={() => void setSort('name')}
				aria-label="名前で並び替え{sortField === 'name'
					? sortOrder === 'asc'
						? ' (現在 昇順)'
						: ' (現在 降順)'
					: ''}"
			>
				名前
				{#if sortField === 'name'}
					{#if sortOrder === 'asc'}<ArrowUp class="h-3 w-3" />{:else}<ArrowDown
							class="h-3 w-3"
						/>{/if}
				{/if}
			</button>
			<button
				type="button"
				class="flex items-center gap-0.5 rounded px-1.5 py-0.5 transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)] {sortField ===
				'mtime'
					? 'bg-[var(--ag-surface-3)] text-[var(--ag-text-primary)]'
					: 'text-[var(--ag-text-secondary)]'}"
				onclick={() => void setSort('mtime')}
				aria-label="更新日時で並び替え{sortField === 'mtime'
					? sortOrder === 'asc'
						? ' (現在 古い順)'
						: ' (現在 新しい順)'
					: ''}"
			>
				更新日時
				{#if sortField === 'mtime'}
					{#if sortOrder === 'asc'}<ArrowUp class="h-3 w-3" />{:else}<ArrowDown
							class="h-3 w-3"
						/>{/if}
				{/if}
			</button>
		</div>
		<ul class="space-y-1">
			{#each sortedEntries as entry (entry.folderPath)}
				{@const currentExe = resolveExe(entry)}
				{@const hasOverride = !!config.item_overrides?.[entry.folderPath]}
				<li class="relative flex min-w-0 items-center gap-1">
					<button
						type="button"
						class="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[var(--ag-text-primary)] transition-[background-color] duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)]"
						aria-label="{entry.folderName} を起動"
						onclick={() => launchEntry(entry)}
					>
						<!-- PH-issue-038 / 検収項目 #19: フォルダ icon → AppWindow (実体は exe 起動なので) -->
						<AppWindow class="h-4 w-4 shrink-0 text-[var(--ag-text-muted)]" />
						<span class="min-w-0 flex-1 truncate">{entry.folderName}</span>
						<span class="shrink-0 text-xs {hasOverride ? 'text-[var(--ag-accent-text)]' : 'text-[var(--ag-text-faint)]'}">
							{entry.exeCandidates.length} exe{hasOverride ? ' ◉' : ''}
						</span>
					</button>
					{#if entry.exeCandidates.length > 1}
						<!-- PH-widget-polish: aria-haspopup / aria-expanded で a11y、data-popover-trigger で
						     click-outside 監視から除外、title で「起動 exe を切替」hint -->
						<button
							type="button"
							class="shrink-0 rounded p-1 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
							aria-label="{entry.folderName} の起動 exe を選ぶ"
							aria-haspopup="menu"
							aria-expanded={candidatePopoverFor === entry.folderPath}
							title="起動 exe を切替"
							data-popover-trigger="exe-cands"
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
									<span class="shrink-0 text-xs text-[var(--ag-text-muted)]">
										{formatBytes(cand.sizeBytes)}{currentExe === cand.path ? ' ✓' : ''}
									</span>
								</button>
							{/each}
							{#if hasOverride}
								<button
									type="button"
									role="menuitem"
									class="mt-1 w-full rounded px-2 py-1.5 text-left text-xs text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-3)]"
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
