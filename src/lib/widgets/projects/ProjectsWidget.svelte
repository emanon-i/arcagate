<script lang="ts">
/**
 * PH-issue-039 / 検収項目 #11-#18: フォルダ監視 widget の polish 集合。
 *
 * - #11: widget instance 独立 (config.watched_folder は widget config なので元から独立)
 * - #12: 名前 「ウォッチフォルダー」 → 「フォルダ監視」 (workspace.ts の WIDGET_LABELS で統一)
 * - #14: ExeFolder と仕様統一 (空状態 EmptyState、scanning / error 表示パターン)
 * - #16: 空状態で「設定を開く」 button 誘導 (ExeFolder と同じ EmptyState pattern)
 * - #17: 各 row のゲームアイコン削除 (folder 型では meaningless)
 * - #18: container query で widget 幅に応じて grid 列数動的調整
 *
 * 引用元 guideline:
 * - docs/desktop_ui_ux_agent_rules.md P3 主要 vs 補助 / P4 一貫性 / P11 装飾より対象
 * - docs/l1_requirements/ux_standards.md §6-1 Widget fluid sizing / §7 EmptyState
 * - CLAUDE.md「ラベルは機能 / 状態 / アクションを書く」
 */
import {
	ArrowDown,
	ArrowUp,
	CircleDot,
	FolderKanban,
	GitBranch,
	Info,
	Settings,
} from '@lucide/svelte';
import { listen } from '@tauri-apps/api/event';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import EmptyState from '$lib/components/common/EmptyState.svelte';
import { t } from '$lib/i18n.svelte';
import { autoRegisterFolderItems } from '$lib/ipc/items';
import { launchItem } from '$lib/ipc/launch';
import { getFolderItems, getFolderMtimesBatch, getGitStatusesBatch } from '$lib/ipc/workspace';
import { itemStore } from '$lib/state/items.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { widgetItemHidesStore } from '$lib/state/widget-item-hides.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { workspaceContextMenuStore } from '$lib/state/workspace-context-menu.svelte';
import type { GitStatus } from '$lib/types/git';
import type { Item } from '$lib/types/item';
import { WIDGET_LABELS, type WorkspaceWidget } from '$lib/types/workspace';
import { formatIpcError } from '$lib/utils/ipc-error';
import { formatLaunchError } from '$lib/utils/launch-error';
import { parseWidgetConfig } from '$lib/utils/widget-config';
import { widgetMenuItems } from '../_shared/menu-items';
import type { WidgetSortField, WidgetSortOrder } from '../_shared/types';

interface Props {
	widget?: WorkspaceWidget;
	onItemContext?: (itemId: string, ev?: MouseEvent) => void;
}

let { widget }: Props = $props();

let folderItems = $state<Item[]>([]);
let gitStatuses = $state<Record<string, GitStatus>>({});
// #10: フォルダ実 mtime (filesystem 更新日時) を path → ms epoch で保持。
// 「更新日時」ソートは DB updated_at ではなくこの実 mtime を参照する。
let folderMtimes = $state<Record<string, number>>({});
let settingsOpen = $state(false);
let scanning = $state(false);
let scanError = $state<string | null>(null);

const PROJECT_CONFIG_DEFAULTS = {
	max_items: 10,
	git_poll_interval_sec: 60,
	// PH-issue-039 / 検収項目 #12: default title を 「フォルダ監視」 に統一。
	title: '',
	description: '',
	watched_folder: '',
	auto_add: false,
	// I-4 (2026-05-10 user 検収): 並び替え (ExeFolder と同じ key 集合、type は _shared/types.ts に集約)。
	sort_field: 'name' as WidgetSortField,
	sort_order: 'asc' as WidgetSortOrder,
	// audit batch deferred (2026-05-13) #8: list / card 表示 mode。
	// Projects は既存の multi-col grid を 'card' default、 'list' 選択時に 1 col 縦 stack に。
	view_mode: 'card' as 'list' | 'card',
};

let config = $derived(parseWidgetConfig(widget?.config, PROJECT_CONFIG_DEFAULTS));

// I-4: sort 適用済 items (元 folderItems は immutable、表示のみ並べ替え)。
// ExeFolder と同じ pattern (個別実装、UI 抽出は 3 件目以降が出てから)。
let sortField = $derived<WidgetSortField>(config.sort_field ?? 'name');
let sortOrder = $derived<WidgetSortOrder>(config.sort_order ?? 'asc');
let viewMode = $derived<'list' | 'card'>(config.view_mode ?? 'list');
let sortedItems = $derived.by(() => {
	// Phase 2 (2026-05-12): per-widget hide filter を sort 前に適用。
	const widgetId = widget?.id ?? null;
	const list = folderItems.filter((i) => !widgetItemHidesStore.has(widgetId, i.target));
	const dir = sortOrder === 'asc' ? 1 : -1;
	if (sortField === 'name') {
		list.sort((a, b) => dir * a.label.localeCompare(b.label, 'ja'));
	} else {
		// #10: 「更新日時」は DB の updated_at ではなく実フォルダの filesystem mtime を参照。
		// asc=古い順 / desc=新しい順。mtime 未取得 (0) は最古扱い。
		list.sort((a, b) => dir * ((folderMtimes[a.target] ?? 0) - (folderMtimes[b.target] ?? 0)));
	}
	return list;
});

// Phase 2: per-widget hide load on mount / widget id change。
$effect(() => {
	if (widget?.id) void widgetItemHidesStore.loadFor(widget.id);
});

async function setSort(field: WidgetSortField) {
	if (!widget) return;
	const nextOrder: WidgetSortOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
	const next = { ...config, sort_field: field, sort_order: nextOrder };
	try {
		await workspaceStore.updateWidgetConfig(widget.id, JSON.stringify(next));
	} catch (e: unknown) {
		toastStore.add(
			formatIpcError({ operation: t('widgets.common.operation_save_settings') }, e),
			'error',
		);
	}
}

// Phase L-1 (2026-05-07 user 検収 Library 真因 #1): N+1 IPC を batch IPC に集約。
// 旧実装は各 folder item ごと cmd_git_status を発火 (10+ folders で累積数秒)、本実装は
// 全 folder paths を 1 IPC `cmd_get_git_statuses_batch` で並列取得 (backend で thread spawn)。
async function fetchGitStatuses(items: Item[], merge = false): Promise<void> {
	const folderItems = items.filter((item) => item.item_type === 'folder');
	if (folderItems.length === 0) {
		if (!merge) gitStatuses = {};
		return;
	}
	const paths = folderItems.map((i) => i.target);
	const pathToItemId = new Map(folderItems.map((i) => [i.target, i.id]));
	let results: Awaited<ReturnType<typeof getGitStatusesBatch>>;
	try {
		results = await getGitStatusesBatch(paths);
	} catch {
		// batch 自体が失敗した場合 (panic 等)、silent skip。caller の polling で次回 retry。
		return;
	}
	const entries: Record<string, GitStatus> = {};
	for (const r of results) {
		if (r.status === null) continue; // git なしフォルダ
		const itemId = pathToItemId.get(r.path);
		if (itemId) entries[itemId] = r.status;
	}
	gitStatuses = merge ? { ...gitStatuses, ...entries } : entries;
}

// #10: フォルダの実 mtime を batch 取得して folderMtimes map を更新。
// load 完了時 + git poll と同タイミングで呼び、監視中も自動で再ソートされる。
async function fetchFolderMtimes(items: Item[]): Promise<void> {
	const paths = items.map((i) => i.target);
	if (paths.length === 0) {
		folderMtimes = {};
		return;
	}
	try {
		const entries = await getFolderMtimesBatch(paths);
		const map: Record<string, number> = {};
		for (const e of entries) map[e.path] = e.mtimeMs;
		folderMtimes = map;
	} catch {
		// best-effort: 取得失敗時は既存 map 維持 (次回 poll で retry)。
	}
}

// PH-issue-039 / 検収項目 #14 (仕様統一): config.watched_folder が変わったら scan を即時 reset + run。
// 旧実装は autoRegisterFolderItems を全 widget の任意 folder で呼んで結果を merge していたため
// 「同じ widget で folder 共有 (#11)」のように見えていた。本実装で widget config 経由のみに限定。
//
// 4/30 user 検収: WatchFolder widget をリサイズすると中身が消えるバグの root cause —
// `workspaceStore.optimisticMoveAndResize` が pointermove のたびに `{...w, ...}` で widget
// オブジェクトを作り直す → ProjectsWidget の `config = $derived(parseWidgetConfig(...))` が
// 毎フレーム新オブジェクト作成 → 本 $effect が再実行 → `folderItems = []` で **毎フレーム
// アイテム消去** されていた。修正: 前回 folder 値を変数で保持し、文字列が変わったときだけ scan
// reset + 再 fetch。これでリサイズ中も folderItems がそのまま残る。
let prevFolder: string | undefined;

// B 案 (#16): watched_folder を file system watcher (watched_paths) に自動連携。
async function ensureWatchedPath(path: string): Promise<void> {
	try {
		const { addWatchedPath } = await import('$lib/ipc/watched_paths');
		await addWatchedPath(path, null);
	} catch (e: unknown) {
		if (!String(e).toLowerCase().includes('unique')) {
			console.warn('ensureWatchedPath failed', e);
		}
	}
}

$effect(() => {
	const folder = config.watched_folder;
	if (folder === prevFolder) return; // resize 等で widget object が更新されても folder 不変なら何もしない
	prevFolder = folder;
	folderItems = [];
	scanError = null;
	if (!folder) {
		scanning = false;
		return;
	}
	// B 案 (#16): file system watcher (watched_paths) に path を自動登録
	void ensureWatchedPath(folder);
	scanning = true;
	autoRegisterFolderItems(folder, widget?.workspace_id)
		.then(async (items) => {
			folderItems = items;
			await fetchGitStatuses(items);
			await fetchFolderMtimes(items);
			// 5/03 user 検収 (B): 「Library に追加してもすべてに含まれない」 fb 対応。
			// auto-register で DB に新規 item を入れた後、itemStore の items / libraryStats /
			// tagWithCounts を再取得し、Library 画面の表示と count を即同期する。
			await itemStore.loadItems();
			await itemStore.loadLibraryStats();
			await itemStore.loadTagWithCounts();
		})
		.catch((e: unknown) => {
			scanError = String(e);
		})
		.finally(() => {
			scanning = false;
		});
});

// ポーリング (git status 更新)
$effect(() => {
	if (folderItems.length === 0) return;
	const interval = config.git_poll_interval_sec * 1000;
	const timer = setInterval(() => {
		void fetchGitStatuses(folderItems);
		// #10: poll 毎にフォルダ実 mtime も再取得 → 監視中の更新で自動再ソート。
		void fetchFolderMtimes(folderItems);
	}, interval);
	return () => clearInterval(timer);
});

// リアルタイム: 監視フォルダに新規ディレクトリが作成されたとき auto_add ON なら即座に登録
$effect(() => {
	if (!config.auto_add || !config.watched_folder) return;
	const folder = config.watched_folder;
	let unlisten: (() => void) | undefined;
	void listen<string>('folder://new-directory', async (event) => {
		const newPath = event.payload;
		const parentPath = newPath.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
		const normalizedFolder = folder.replace(/\\/g, '/').replace(/\/$/, '');
		if (parentPath !== normalizedFolder) return;
		const newItems = await autoRegisterFolderItems(folder, widget?.workspace_id);
		if (newItems.length > 0) {
			const existingIds = new Set(folderItems.map((i) => i.id));
			const merged = [...folderItems, ...newItems.filter((i) => !existingIds.has(i.id))];
			folderItems = merged;
			void fetchGitStatuses(newItems, true);
		}
	}).then((fn) => {
		unlisten = fn;
	});
	return () => unlisten?.();
});

let title = $derived(config.title || WIDGET_LABELS.projects);

let menuItems = $derived(widgetMenuItems(widget, () => (settingsOpen = true)));

async function handleLaunch(item: Item) {
	try {
		await launchItem(item.id);
		toastStore.add(t('toast.launched_label', { label: item.label }), 'success');
	} catch (e: unknown) {
		toastStore.add(formatLaunchError(item.label, e), 'error');
	}
}
</script>

<WidgetShell {title} icon={FolderKanban} {menuItems}>
	{#if !config.watched_folder}
		<!-- PH-issue-039 / 検収項目 #16: ExeFolder と同じ EmptyState で「設定を開く」誘導 -->
		<EmptyState
			icon={FolderKanban}
			title={t('widgets.projects.empty_title')}
			description={t('widgets.projects.empty_description')}
			action={{
				label: t('widgets.common.open_settings'),
				icon: Settings,
				onClick: () => (settingsOpen = true),
			}}
			testId="projects-empty-state"
		/>
	{:else if scanning}
		<p class="text-sm text-[var(--ag-text-muted)]">{t('widgets.common.scanning')}</p>
	{:else if scanError}
		<p class="text-sm text-[var(--ag-error-text)]">{t('widgets.common.error_prefix', { error: scanError })}</p>
	{:else if folderItems.length === 0}
		<p class="text-sm text-[var(--ag-text-muted)]">
			{t('widgets.projects.no_subfolders')}
		</p>
	{:else}
		<!-- B-7 #9: Settings description は info icon + hover tooltip に変更 (widget 領域圧迫防止) -->
		{#if config.description}
			<div class="mb-3 flex items-center gap-1 text-xs text-[var(--ag-text-muted)]">
				<button
					type="button"
					aria-label={t('widgets.common.show_description')}
					class="flex shrink-0 items-center justify-center rounded p-0.5 hover:bg-[var(--ag-surface-4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
					title={config.description}
				>
					<Info class="h-3.5 w-3.5" />
				</button>
				<span class="truncate">{t('widgets.common.description_label')}</span>
			</div>
		{/if}
		<!-- I-4 (2026-05-10 user 検収): 並び替え toolbar (ExeFolder I-3 と同じ sticky pattern)。
		     widget header に pin して scroll 中も常時操作可能。
		     ag-sticky-bar で widget 本体 glass 面の継続にする (独立した塗りつぶし矩形を持たない)。 -->
		<div
			class="ag-sticky-bar sticky top-0 z-10 -mx-4 -mt-1 mb-2 flex shrink-0 items-center gap-1 border-b border-[var(--ag-border)] px-4 pb-1.5 pt-1 text-xs"
		>
			<span class="text-[var(--ag-text-muted)]">{t('widgets.common.sort_label')}</span>
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
		</div>
		<!-- PH-issue-039 / 検収項目 #18: container query で widget 幅に応じて 1/2/3 列に動的調整。
		     PH-issue-039 / 検収項目 #17: 各 row のアイコンを削除 (folder 型では meaningless)。
		     git branch chip + 変更数 chip を保持 (P3 主要情報)。 -->
		<!-- audit batch deferred (2026-05-13) #8: list mode は 1-col 縦 stack、 card mode は
		     既存の @container query で 1/2/3 col grid。 viewMode が config に保存される。 -->
		<div class="@container">
			<div class={viewMode === 'list' ? 'grid grid-cols-1 gap-2' : 'grid gap-2 @sm:grid-cols-2 @lg:grid-cols-3'}>
				{#each sortedItems as item (item.id)}
					{@const gs = gitStatuses[item.id]}
					<button
						type="button"
						class="rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] p-3 text-left transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)]"
						aria-label={t('widgets.common.launch_with_context', { label: item.label })}
						title={item.target}
						onclick={() => void handleLaunch(item)}
						oncontextmenu={(e) => {
							e.preventDefault();
							e.stopPropagation();
							workspaceContextMenuStore.openMenuFor({
								itemId: item.id,
								path: item.target,
								widgetId: widget?.id ?? null,
								onOpenSettings: () => (settingsOpen = true),
								ev: e,
							});
						}}
					>
						<div class="min-w-0 truncate text-sm font-semibold text-[var(--ag-text-primary)]">
							{item.label}
						</div>
						<div class="mt-1 truncate text-xs text-[var(--ag-text-muted)]">{item.target}</div>
						{#if gs}
							<div class="mt-2 flex min-w-0 items-center gap-2 text-xs text-[var(--ag-text-secondary)]">
								<GitBranch class="h-3.5 w-3.5 shrink-0" />
								<span class="min-w-0 flex-1 truncate" title="branch: {gs.branch}">{gs.branch}</span>
								{#if gs.has_changes}
									<span
										class="flex shrink-0 items-center gap-0.5 text-[var(--ag-warm-text)]"
										title={t('widgets.projects.changed_count', { count: gs.changed_count })}
									>
										<CircleDot class="h-3 w-3" />
										{gs.changed_count}
									</span>
								{/if}
							</div>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog
		{widget}
		open={settingsOpen}
		onClose={() => {
			settingsOpen = false;
		}}
	/>
{/if}
