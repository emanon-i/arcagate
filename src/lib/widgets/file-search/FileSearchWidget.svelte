<script lang="ts">
import { File, FileSearch, Folder, FolderOpen, Search } from '@lucide/svelte';
import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import EmptyState from '$lib/components/common/EmptyState.svelte';
import ErrorState from '$lib/components/common/ErrorState.svelte';
import LoadingState from '$lib/components/common/LoadingState.svelte';
import { t } from '$lib/i18n.svelte';
import { launchItem } from '$lib/ipc/launch';
import { itemStore } from '$lib/state/items.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { workspaceContextMenuStore } from '$lib/state/workspace-context-menu.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';
import { getErrorCode, getErrorMessage } from '$lib/utils/format-error';
import { formatIpcError } from '$lib/utils/ipc-error';
import { widgetMenuItems } from '../_shared/menu-items';

interface Props {
	widget?: WorkspaceWidget;
}

let { widget }: Props = $props();
let settingsOpen = $state(false);

interface FileEntry {
	path: string;
	name: string;
	isDir: boolean;
	sizeBytes: number;
}

interface FileSearchConfig {
	root?: string;
	depth?: number;
	limit?: number;
	title?: string;
}

let config = $derived.by<FileSearchConfig>(() => {
	if (!widget?.config) return {};
	try {
		return JSON.parse(widget.config) as FileSearchConfig;
	} catch {
		return {};
	}
});

let root = $derived(config.root ?? '');
let depth = $derived(Math.max(1, Math.min(3, config.depth ?? 2)));
let limit = $derived(Math.max(10, Math.min(2000, config.limit ?? 200)));

let entries = $state<FileEntry[]>([]);
let query = $state('');
let loading = $state(false);
let lastError = $state<string | null>(null);
let currentSearchId = $state<string | null>(null);
// PH-issue-018: keyboard nav state. ArrowUp/Down で動かし、Enter で起動。
let selectedIndex = $state(0);
// audit batch (2026-05-13) #3.2: 非アクティブ時に選択 ring が残る bug 対策。
// search input focus 中のみ selection を可視化する。
let searchActive = $state(false);

function newSearchId(): string {
	// crypto.randomUUID は Tauri webview で利用可能 (Chromium 92+)
	return crypto.randomUUID();
}

async function refresh() {
	// PH-issue-017: 派生 state を即時 clear (root 変更時の旧 entries 残留防止)。
	entries = [];
	lastError = null;
	if (!root) {
		loading = false;
		return;
	}
	const searchId = newSearchId();
	currentSearchId = searchId;
	loading = true;
	try {
		const result = await invoke<FileEntry[]>('cmd_list_files', {
			searchId,
			root,
			depth,
			limit,
		});
		// stale response 破棄: 自分が最新の searchId でなければ書き戻さない。
		if (currentSearchId !== searchId) return;
		entries = result;
	} catch (e: unknown) {
		if (currentSearchId !== searchId) return;
		// Cancelled は silent (UI 側で「中止しました」toast を別途出す)
		// PH-445: errorCode 経由判定 (string contains から構造化判定へ)
		if (getErrorCode(e) === 'cancelled') {
			entries = [];
		} else {
			lastError = getErrorMessage(e);
			entries = [];
		}
	} finally {
		if (currentSearchId === searchId) {
			loading = false;
			currentSearchId = null;
		}
	}
}

async function cancelCurrent() {
	if (!currentSearchId) return;
	const id = currentSearchId;
	const cancelled = await invoke<boolean>('cmd_cancel_file_search', { searchId: id });
	if (cancelled) {
		toastStore.add(t('toast.search_aborted'), 'info');
	}
}

// 4/30 user 検収: ProjectsWidget / ExeFolder と同じ resize-empties-content bug。
// optimisticMoveAndResize が widget object を毎フレーム差し替え → config $derived 再評価 →
// 本 $effect が refresh() を呼び entries=[] でリセット → リサイズ中ずっと空。
// 実値変更時のみ refresh する。
let prevRoot: string | undefined;
let prevDepth: number | undefined;
let prevLimit: number | undefined;
$effect(() => {
	if (root === prevRoot && depth === prevDepth && limit === prevLimit) return;
	prevRoot = root;
	prevDepth = depth;
	prevLimit = limit;
	void refresh();
});

let filtered = $derived.by(() => {
	const q = query.trim().toLowerCase();
	if (!q) return entries.slice(0, 50);
	return entries.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 50);
});

async function openEntry(entry: FileEntry) {
	try {
		// Library 登録済の exe (target 一致) は launchItem 経由で launch_log 記録。
		// 未登録 / フォルダ / 非 exe ファイルは raw OS 起動 (cmd_open_path)。
		const item = !entry.isDir ? itemStore.items.find((i) => i.target === entry.path) : undefined;
		if (item) {
			await launchItem(item.id);
		} else {
			await invoke('cmd_open_path', { path: entry.path });
		}
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: t('error.op.file_open') }, e), 'error');
	}
}

// PH-issue-018: query が変わったら selection を先頭に戻す。
$effect(() => {
	const _q = query;
	selectedIndex = 0;
});

// PH-issue-018: ArrowUp / ArrowDown / Enter で keyboard nav。
// IME 確定中 (e.isComposing) は無視 (lessons.md IME 対応)。
function handleSearchKeydown(e: KeyboardEvent) {
	if (e.isComposing) return;
	if (filtered.length === 0) return;
	if (e.key === 'ArrowDown') {
		e.preventDefault();
		selectedIndex = Math.min(selectedIndex + 1, filtered.length - 1);
	} else if (e.key === 'ArrowUp') {
		e.preventDefault();
		selectedIndex = Math.max(selectedIndex - 1, 0);
	} else if (e.key === 'Enter') {
		e.preventDefault();
		const target = filtered[selectedIndex];
		if (target) void openEntry(target);
	}
}

async function pickRoot() {
	const selected = await openDialog({
		directory: true,
		multiple: false,
		title: t('widgets.file_search.picker_title'),
	});
	if (!selected || Array.isArray(selected)) return;
	// config 直接更新は workspaceStore 経由（settings dialog と同じ振る舞い）
	const { workspaceStore } = await import('$lib/state/workspace.svelte');
	if (!widget) return;
	const next: FileSearchConfig = { ...config, root: selected };
	await workspaceStore.updateWidgetConfig(widget.id, JSON.stringify(next));
}

let menuItems = $derived(widgetMenuItems(widget, () => (settingsOpen = true)));
</script>

<!-- Lateral sweep (2026-05-12): root path を WidgetShell に渡し、 body 右クリック menu で
     「検索 root のパスをコピー / Explorer で開く」 を有効化。 PR #440 の Fix A と同パターン。 -->
<WidgetShell title={config.title || t('widgets.file_search.default_title')} icon={FileSearch} {menuItems} path={root}>
	{#if !root}
		<!-- PH-issue-022: 共通 EmptyState component で統一 (P12 整合性、§7 Do/Don't) -->
		<EmptyState
			icon={FolderOpen}
			title={t('widgets.file_search.empty_title')}
			description={t('widgets.file_search.empty_desc')}
			action={{
				label: t('widgets.file_search.pick_root_button'),
				icon: FolderOpen,
				onClick: () => void pickRoot(),
			}}
			testId="file-search-empty-state"
		/>
	{:else}
		<!-- PH-issue-018: 検索バー sticky で scroll 中も検索可能。z-1 で結果リストより上。
		     ag-sticky-bar で widget 本体 glass 面の継続にする (独立した塗りつぶし矩形を持たない)。 -->
		<div class="ag-sticky-bar sticky top-0 z-[1] mb-2 flex items-center gap-1 pb-1">
			<div class="flex flex-1 items-center gap-1 rounded border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2">
				<Search class="h-3 w-3 text-[var(--ag-text-muted)]" />
				<input
					type="text"
					class="min-w-0 flex-1 bg-transparent py-1 text-xs text-[var(--ag-text-primary)] focus-visible:outline-none"
					placeholder={t('widgets.file_search.filter_placeholder')}
					autocomplete="off"
					bind:value={query}
					onkeydown={handleSearchKeydown}
					onfocus={() => (searchActive = true)}
					onblur={() => (searchActive = false)}
				/>
			</div>
		</div>
		{#if loading}
			<!-- A3 (PH-PQ-600): 独自 loading UI を共通 LoadingState に統一。
			     長い fs walk の「中止」は LoadingState の action slot で担保。 -->
			<LoadingState
				description={t('widgets.file_search.searching')}
				action={{
					label: t('widgets.file_search.cancel_button'),
					onClick: () => void cancelCurrent(),
				}}
				testId="file-search-loading-state"
			/>
		{:else if lastError}
			<ErrorState
				title={t('widgets.common.load_failed')}
				description={lastError}
				testId="file-search-error-state"
			/>
		{:else if filtered.length === 0}
			<EmptyState
				icon={Search}
				title={query ? t('widgets.file_search.no_match') : t('widgets.file_search.no_files')}
				testId="file-search-no-results-state"
			/>
		{:else}
			<ul class="space-y-1">
				{#each filtered as entry, idx (entry.path)}
					{@const isSelected = idx === selectedIndex}
					<li>
						<!-- audit batch (2026-05-13) #3.1: ring-1 が widget content の overflow-x-hidden で
						     左端 1px 切られる問題対策で ring-inset に変更。 #3.2: searchActive=false 時
						     selection ring を非表示 (非アクティブ時状態残り回避)。 -->
						<button
							type="button"
							class="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)] {isSelected && searchActive
								? 'bg-[var(--ag-surface-3)] ring-1 ring-inset ring-[var(--ag-accent)]'
								: ''}"
							aria-label={t('widgets.file_search.open_aria', { name: entry.name })}
							aria-current={isSelected ? 'true' : undefined}
							onclick={() => {
								selectedIndex = idx;
								void openEntry(entry);
							}}
							oncontextmenu={(e) => {
								e.preventDefault();
								e.stopPropagation();
								const matchedItem = itemStore.items.find((it) => it.target === entry.path);
								workspaceContextMenuStore.openMenuFor({
									itemId: matchedItem?.id ?? null,
									path: entry.path,
									widgetId: widget?.id ?? null,
									onOpenSettings: () => (settingsOpen = true),
									ev: e,
								});
							}}
						>
							{#if entry.isDir}
								<Folder class="h-3 w-3 shrink-0 text-[var(--ag-text-muted)]" />
							{:else}
								<File class="h-3 w-3 shrink-0 text-[var(--ag-text-muted)]" />
							{/if}
							<span class="min-w-0 flex-1 truncate text-[var(--ag-text-primary)]">{entry.name}</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => (settingsOpen = false)} />
{/if}
