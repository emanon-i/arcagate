<script lang="ts">
import {
	AppWindow,
	ArrowDown,
	ArrowUp,
	FolderOpen,
	Info,
	LayoutGrid,
	LayoutList,
	MoreHorizontal,
	Settings,
} from '@lucide/svelte';
import { invoke } from '@tauri-apps/api/core';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import EmptyState from '$lib/components/common/EmptyState.svelte';
import ErrorState from '$lib/components/common/ErrorState.svelte';
import LoadingState from '$lib/components/common/LoadingState.svelte';
import { t } from '$lib/i18n.svelte';
import { registerExeItemsBulk } from '$lib/ipc/items';
import { itemStore } from '$lib/state/items.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { widgetItemHidesStore } from '$lib/state/widget-item-hides.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { workspaceContextMenuStore } from '$lib/state/workspace-context-menu.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';
import { getErrorMessage } from '$lib/utils/format-error';
import { formatIpcError } from '$lib/utils/ipc-error';
import { launchItemWithCascade, launchTargetWithCascade } from '$lib/utils/launch-cascade';
import { formatLaunchError } from '$lib/utils/launch-error';
import { parseWidgetConfig } from '$lib/utils/widget-config';
import { widgetMenuItems } from '../_shared/menu-items';
import type { WidgetSortField, WidgetSortOrder } from '../_shared/types';
import { DEFAULT_EXE_FOLDER_EXTENSIONS } from './index';

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
	/** バックエンドが返す mtime (ms epoch、無ければ 0)。 */
	mtimeMs?: number;
}

interface WidgetConfig {
	watch_path?: string;
	scan_depth?: number;
	/** PH-CF-400: 監視拡張子 (可変、 default は DEFAULT_EXE_FOLDER_EXTENSIONS)。 */
	extensions?: string[];
	title?: string;
	/** Settings dialog で入力する説明欄を widget 内に表示する。 */
	description?: string;
	item_overrides?: Record<string, string>;
	/** 並び替え設定 (I-4 で _shared/types.ts に集約)。 */
	sort_field?: WidgetSortField;
	sort_order?: WidgetSortOrder;
	/** C-15 #19: widget レベルの起動アプリ default。 */
	default_opener_id?: string | null;
	/** audit batch deferred (2026-05-13) #8: list / card 表示 mode。 */
	view_mode?: 'list' | 'card';
}

// PH-CF-500 D3: parseWidgetConfig helper で 3 監視 widget 共通の config パース契約に統一。
let config = $derived(parseWidgetConfig<WidgetConfig>(widget?.config, {}));

let entries = $state<ExeFolderEntry[]>([]);
let scanning = $state(false);
let scanError = $state<string | null>(null);
let descExpanded = $state(false);

// sort 適用済 entries (元 entries は immutable、表示のみ並べ替え)
let sortField = $derived<WidgetSortField>(config.sort_field ?? 'name');
let sortOrder = $derived<WidgetSortOrder>(config.sort_order ?? 'asc');
// audit batch deferred (2026-05-13) #8: list / card 表示 mode 切替。
let viewMode = $derived<'list' | 'card'>(config.view_mode ?? 'list');
let sortedEntries = $derived.by(() => {
	// Phase 2 (2026-05-12): per-widget hide filter を適用。
	// ExeFolder の hide key は folder_path (entry.folderPath、 user 視点の「folder」 単位)。
	const widgetId = widget?.id ?? null;
	const list = entries.filter((e) => !widgetItemHidesStore.has(widgetId, e.folderPath));
	const dir = sortOrder === 'asc' ? 1 : -1;
	if (sortField === 'name') {
		list.sort((a, b) => dir * a.folderName.localeCompare(b.folderName, 'ja'));
	} else {
		// mtime descending = 新しい順 (asc=古い順)
		list.sort((a, b) => dir * ((a.mtimeMs ?? 0) - (b.mtimeMs ?? 0)));
	}
	return list;
});

// Phase 2: per-widget hide load on mount。
$effect(() => {
	if (widget?.id) void widgetItemHidesStore.loadFor(widget.id);
});

async function setSort(field: WidgetSortField) {
	const nextOrder: WidgetSortOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
	await persistConfig({ ...config, sort_field: field, sort_order: nextOrder });
}

async function setViewMode(mode: 'list' | 'card') {
	if (viewMode === mode) return;
	await persistConfig({ ...config, view_mode: mode });
}
// 古い path の async 結果が新 path に書き戻されないよう request id で stale response を破棄。
let scanRequestId = 0;
// W-3: backend scan の cancel 用。widget ごとに stable な search_id を持ち、
// 同 id で再 scan すると backend が前回 scan を自動 cancel する (path/depth 変更時)。
const scanSearchId = crypto.randomUUID();

// W-3: widget unmount 時に進行中の backend scan を中断する。
$effect(() => {
	return () => {
		void invoke('cmd_cancel_exe_scan', { searchId: scanSearchId });
	};
});

// optimisticMoveAndResize が widget object を作り直して config 新参照 → `entries = []` が
// 毎フレーム実行され scan 結果が消える bug 対策。前回 path/depth/extensions を覚えて実値変化時のみ reset。
let prevPath: string | undefined;
let prevDepth: number | undefined;
let prevExtensionsKey: string | undefined;

// B 案 (#16 cascade): watch_path 設定時に file system watcher (watched_paths) に自動連携。
// duplicate (UNIQUE constraint) は silent skip。
async function ensureWatchedPath(path: string): Promise<void> {
	try {
		const { addWatchedPath } = await import('$lib/ipc/watched_paths');
		await addWatchedPath(path, null);
	} catch (e: unknown) {
		// path UNIQUE 違反は OK (既に登録済)
		if (!String(e).toLowerCase().includes('unique')) {
			console.warn('ensureWatchedPath failed', e);
		}
	}
}

// Lazy fetch: watch_path / scan_depth / extensions が設定されたとき + 変化時に scan
$effect(() => {
	const path = config.watch_path;
	const depth = config.scan_depth ?? 2;
	const extensions =
		config.extensions && config.extensions.length > 0
			? config.extensions
			: [...DEFAULT_EXE_FOLDER_EXTENSIONS];
	const extensionsKey = extensions.join('|');
	if (path === prevPath && depth === prevDepth && extensionsKey === prevExtensionsKey) return;
	prevPath = path;
	prevDepth = depth;
	prevExtensionsKey = extensionsKey;
	// 派生 state を即時 clear (path / depth / extensions 変更 / unset 直後に旧 entries が残らない)。
	entries = [];
	scanError = null;
	if (!path) {
		scanning = false;
		return;
	}
	// B 案 (#16): file system watcher (watched_paths) に path を自動登録
	void ensureWatchedPath(path);
	const myId = ++scanRequestId;
	scanning = true;
	invoke<ExeFolderEntry[]>('cmd_scan_exe_folders', {
		searchId: scanSearchId,
		root: path,
		depth,
		extensions,
	})
		.then(async (result) => {
			if (myId !== scanRequestId) return;
			entries = result;
			// scan 完了時に発見 exe を Library に自動登録 (idempotent: 既存 target は skip)。
			// PH-CF-400: entry_key (= 第1階層フォルダ folder_path) を paths と同順で送る。
			const paths: string[] = [];
			const entryKeys: string[] = [];
			for (const entry of result) {
				const override = config.item_overrides?.[entry.folderPath];
				const exePath =
					override && entry.exeCandidates.some((c) => c.path === override)
						? override
						: entry.exeCandidates[0]?.path;
				if (exePath) {
					paths.push(exePath);
					entryKeys.push(entry.folderPath);
				}
			}
			if (paths.length > 0) {
				// U-7 (2026-05-12): widget の workspace_id を渡して sys-ws-<id> tag 自動付与。
				// PH-CF-100: source_widget_id を渡して 監視 widget back-link を埋める →
				// user が Library で削除した entry は widget_item_hides 連動で復活しない (モグラ叩き解消)。
				// PH-CF-400: entryKeys = 第1階層フォルダ folderPath を同順で送る (= scan entry id)。
				await registerExeItemsBulk(paths, entryKeys, widget?.workspace_id, widget?.id).catch(
					(e: unknown) => {
						console.warn('exe auto-register failed', e);
					},
				);
				// Library の「すべて」 / 各タグ count まで完全同期。
				await itemStore.loadItems();
				await itemStore.loadLibraryStats();
				await itemStore.loadTagWithCounts();
			}
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
		toastStore.add(
			formatIpcError({ operation: t('widgets.common.operation_save_settings') }, e),
			'error',
		);
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
		toastStore.add(t('toast.exe_not_found_folder', { folder: entry.folderName }), 'error');
		return;
	}
	// C-15 #19: cascade resolve (card override → widget default_opener_id → system)。
	// Library 自動登録済の exe は launchItemWithCascade 経由 (item-level + widget-level cascade)。
	// 未登録 + widget opener 指定 → launchTargetWithCascade、いずれも無 → cmd_open_path fallback。
	const item = itemStore.items.find((i) => i.target === exePath);
	if (item) {
		void launchItemWithCascade(item, { widgetDefaultOpenerId: config.default_opener_id })
			.then(() => toastStore.add(t('toast.launched_label', { label: entry.folderName }), 'success'))
			.catch((e: unknown) => toastStore.add(formatLaunchError(entry.folderName, e), 'error'));
	} else if (config.default_opener_id) {
		void launchTargetWithCascade(exePath, { widgetDefaultOpenerId: config.default_opener_id })
			.then(() => toastStore.add(t('toast.launched_label', { label: entry.folderName }), 'success'))
			.catch((e: unknown) => toastStore.add(formatLaunchError(entry.folderName, e), 'error'));
	} else {
		void invoke('cmd_open_path', { path: exePath })
			.then(() => toastStore.add(t('toast.launched_label', { label: entry.folderName }), 'success'))
			.catch((e: unknown) => toastStore.add(formatLaunchError(entry.folderName, e), 'error'));
	}
}

// 手動 register button は撤廃。scan 完了時に上の $effect で registerExeItemsBulk 自動呼出。

let menuItems = $derived(widgetMenuItems(widget, () => (settingsOpen = true)));
</script>

<!-- Lateral sweep (2026-05-12): config.watch_path を WidgetShell に渡し、 widget body 右クリック menu
     で「監視 folder のパスをコピー / Explorer で開く」 を有効化。 PR #440 の Fix A と同パターン。
     PH-CF-500 D3: shell icon を meta (index.ts: FolderOpen) と一致させる
     (旧 AppWindow は palette の widget タイル / library 詳細 と乖離していた)。 -->
<WidgetShell title={config.title || t('widgets.widget_label.exe_folder')} icon={FolderOpen} {menuItems} path={config.watch_path}>
	<!-- B-7 #9 / PH-PQ-500: description は disclosure button。click で inline 展開
	     (旧実装は onclick 無しの dead button + native title tooltip だった)。 -->
	{#if config.description}
		<div class="mb-2 text-xs text-[var(--ag-text-muted)]">
			<button
				type="button"
				class="flex items-center gap-1 rounded px-0.5 py-0.5 hover:bg-[var(--ag-surface-4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
				aria-expanded={descExpanded}
				onclick={() => (descExpanded = !descExpanded)}
			>
				<Info class="h-3.5 w-3.5 shrink-0" />
				<span class="truncate">{t('widgets.common.description_label')}</span>
			</button>
			{#if descExpanded}
				<p class="mt-1 whitespace-pre-wrap break-words pl-0.5 text-[var(--ag-text-secondary)]">{config.description}</p>
			{/if}
		</div>
	{/if}
	{#if !config.watch_path}
		<!-- PH-issue-022: 共通 EmptyState component で統一 (P12 整合性、§7 Do/Don't) -->
		<EmptyState
			icon={FolderOpen}
			title={t('widgets.exe_folder.empty_title')}
			description={t('widgets.exe_folder.empty_description')}
			action={{
				label: t('widgets.common.open_settings'),
				icon: Settings,
				onClick: () => (settingsOpen = true),
			}}
			testId="exe-folder-empty-state"
		/>
	{:else if scanning}
		<LoadingState description={t('widgets.common.scanning')} testId="exe-folder-loading-state" />
	{:else if scanError}
		<ErrorState
			title={t('widgets.common.load_failed')}
			description={scanError}
			testId="exe-folder-error-state"
		/>
	{:else if entries.length === 0}
		<EmptyState
			icon={AppWindow}
			title={t('widgets.exe_folder.no_exe_subfolders')}
			testId="exe-folder-no-entries-state"
		/>
	{:else}
		<!-- 並び替え toolbar (5/03 user 検収: 旧「全部 Library 追加」 button は撤廃。auto-register on scan に統一)。
		     I-3 (2026-05-10 user 検収): scroll で消えないよう sticky top-0 で widget header 領域に pin。
		     ag-sticky-bar で widget 本体 glass 面の継続にする (独立した塗りつぶし矩形を持たない)。
		     padding は WidgetShell の p-3 と一致させて (-mx-3 / px-3) widget の rounded
		     glass 領域内に sticky bar を完全に収める。「並び替え:」 prefix label は
		     タブ (Name / Updated) で意味が通るため撤去。 -->
		<div class="ag-sticky-bar sticky top-0 z-10 -mx-3 -mt-1 mb-2 flex shrink-0 items-center gap-1 px-3 pb-1.5 pt-1 text-xs">
			<button
				type="button"
				class="flex items-center gap-0.5 rounded px-1.5 py-0.5 transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)] {sortField ===
				'name'
					? 'bg-[var(--ag-surface-3)] text-[var(--ag-text-primary)]'
					: 'text-[var(--ag-text-secondary)]'}"
				onclick={() => void setSort('name')}
				aria-label="{t('widgets.common.sort_by_name')}{sortField === 'name'
					? sortOrder === 'asc'
						? t('widgets.common.sort_current_asc')
						: t('widgets.common.sort_current_desc')
					: ''}"
			>
				{t('widgets.common.sort_name')}
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
				aria-label="{t('widgets.common.sort_by_mtime')}{sortField === 'mtime'
					? sortOrder === 'asc'
						? t('widgets.common.sort_current_oldest')
						: t('widgets.common.sort_current_newest')
					: ''}"
			>
				{t('widgets.common.sort_mtime')}
				{#if sortField === 'mtime'}
					{#if sortOrder === 'asc'}<ArrowUp class="h-3 w-3" />{:else}<ArrowDown
							class="h-3 w-3"
						/>{/if}
				{/if}
			</button>
			<!-- list / card view 切替 (PH-PQ-500: config.view_mode を操作する UI を追加)。 -->
			<div class="ml-auto flex items-center gap-0.5">
				<button
					type="button"
					class="flex items-center rounded p-1 transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {viewMode ===
					'list'
						? 'bg-[var(--ag-surface-3)] text-[var(--ag-text-primary)]'
						: 'text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)]'}"
					aria-label={t('widgets.common.list_view')}
					aria-pressed={viewMode === 'list'}
					title={t('widgets.common.list_view')}
					onclick={() => void setViewMode('list')}
				>
					<LayoutList class="h-3 w-3" />
				</button>
				<button
					type="button"
					class="flex items-center rounded p-1 transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {viewMode ===
					'card'
						? 'bg-[var(--ag-surface-3)] text-[var(--ag-text-primary)]'
						: 'text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)]'}"
					aria-label={t('widgets.common.card_view')}
					aria-pressed={viewMode === 'card'}
					title={t('widgets.common.card_view')}
					onclick={() => void setViewMode('card')}
				>
					<LayoutGrid class="h-3 w-3" />
				</button>
			</div>
		</div>
		<!-- audit batch deferred (2026-05-13) #8: list / card 表示 mode 切替。 card は @container で grid。
		     list は 1 列、 card は auto-fit minmax(120px, 1fr) で widget 幅に応じて折返し。
		     PH-CF-500 D1: card mode で `ul > div.grid` の不正ネストを撤去し div.grid を直 render。
		     list mode は引き続き ul + li を使う。 -->
		{#if viewMode === 'card'}
			<div class="@container">
				<div class="grid gap-1.5" style="grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));">
					{#each sortedEntries as entry (entry.folderPath)}
						{@const currentExe = resolveExe(entry)}
						{@const hasOverride = !!config.item_overrides?.[entry.folderPath]}
						<button
							type="button"
							class="flex flex-col items-center gap-1 rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-2 text-center text-sm text-[var(--ag-text-primary)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)]"
							aria-label={t('widgets.common.launch_label', { label: entry.folderName })}
							title={entry.folderPath}
							onclick={() => launchEntry(entry)}
							oncontextmenu={(e) => {
								e.preventDefault();
								e.stopPropagation();
								const exePath = resolveExe(entry) ?? entry.folderPath;
								const matchedItem = itemStore.items.find((it) => it.target === exePath);
								workspaceContextMenuStore.openMenuFor({
									itemId: matchedItem?.id ?? null,
									path: entry.folderPath,
									widgetId: widget?.id ?? null,
									onOpenSettings: () => (settingsOpen = true),
									ev: e,
								});
							}}
						>
							<AppWindow class="h-6 w-6 shrink-0 text-[var(--ag-text-muted)]" />
							<span class="line-clamp-2 min-w-0 w-full break-all">{entry.folderName}</span>
							<span class="shrink-0 text-xs {hasOverride ? 'text-[var(--ag-accent-text)]' : 'text-[var(--ag-text-faint)]'}">
								{entry.exeCandidates.length} exe{hasOverride ? ' ◉' : ''}
							</span>
						</button>
					{/each}
				</div>
			</div>
		{:else}
		<ul class="space-y-1">
			{#each sortedEntries as entry (entry.folderPath)}
				{@const currentExe = resolveExe(entry)}
				{@const hasOverride = !!config.item_overrides?.[entry.folderPath]}
				<!-- audit batch deferred (2026-05-13) #7: 「...」 button を main row 内部に統合。
				     視覚的に 1 つの button に見える (rounded outer 共有 + 隣接 background) が、
				     click 領域は launch / popup で分離 (stopPropagation で main click が popup に
				     伝播しない)。 挙動は従来通り。 -->
				<li class="relative flex min-w-0 items-center rounded-md transition-[background-color] duration-[var(--ag-duration-fast)] motion-reduce:transition-none hover:bg-[var(--ag-surface-3)]">
					<button
						type="button"
						class="flex min-w-0 flex-1 items-center gap-2 rounded-l-md px-2 py-1.5 text-left text-sm text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ag-accent)] {entry.exeCandidates.length > 1 ? '' : 'rounded-r-md'}"
						aria-label={t('widgets.common.launch_with_context', { label: entry.folderName })}
						onclick={() => launchEntry(entry)}
						oncontextmenu={(e) => {
							e.preventDefault();
							e.stopPropagation();
							const exePath = resolveExe(entry) ?? entry.folderPath;
							const matchedItem = itemStore.items.find((it) => it.target === exePath);
							workspaceContextMenuStore.openMenuFor({
								itemId: matchedItem?.id ?? null,
								path: entry.folderPath,
								widgetId: widget?.id ?? null,
								onOpenSettings: () => (settingsOpen = true),
								ev: e,
							});
						}}
					>
						<AppWindow class="h-4 w-4 shrink-0 text-[var(--ag-text-muted)]" />
						<span class="min-w-0 flex-1 truncate">{entry.folderName}</span>
						<span class="shrink-0 text-xs {hasOverride ? 'text-[var(--ag-accent-text)]' : 'text-[var(--ag-text-faint)]'}">
							{entry.exeCandidates.length} exe{hasOverride ? ' ◉' : ''}
						</span>
					</button>
					{#if entry.exeCandidates.length > 1}
						<button
							type="button"
							class="shrink-0 rounded-r-md px-1.5 py-1.5 text-[var(--ag-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ag-accent)] hover:text-[var(--ag-text-primary)] hover:bg-[var(--ag-surface-4)]"
							aria-label={t('widgets.exe_folder.select_exe_aria', { label: entry.folderName })}
							aria-haspopup="menu"
							aria-expanded={candidatePopoverFor === entry.folderPath}
							title={t('widgets.exe_folder.switch_exe_title')}
							data-popover-trigger="exe-cands"
							onclick={(e) => {
								e.stopPropagation();
								candidatePopoverFor = candidatePopoverFor === entry.folderPath ? null : entry.folderPath;
							}}
						>
							<MoreHorizontal class="h-3 w-3" />
						</button>
					{/if}
					{#if candidatePopoverFor === entry.folderPath}
						<div
							role="menu"
							class="ag-glass absolute right-0 top-full z-10 mt-1 w-72 max-w-full rounded-md border border-[var(--ag-border)] p-1 shadow-[var(--ag-shadow-md)]"
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
									{t('widgets.exe_folder.auto_select_reset')}
								</button>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
		{/if}
	{/if}
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => (settingsOpen = false)} />
{/if}
