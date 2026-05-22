<script lang="ts">
/**
 * #11: スクリプトフォルダ監視 widget。
 *
 * 監視フォルダ配下の allowlist スクリプト (.bat/.cmd/.ps1/.sh/.py 等) を列挙し、
 * クリックで OS shell 経由実行する。Exe フォルダ監視と同等の posture。
 *
 * セキュリティ: 実行 path は監視フォルダ配下に限定 (backend で canonicalize +
 * confinement 検証)、拡張子は allowlist 厳密照合、実行はインタプリタ + パスを
 * 別 argv で渡す (shell 文字列結合なし)。実行前に確認ダイアログ (default ON、
 * 設定で off 可)。
 */
import { ArrowDown, ArrowUp, FileCode, FolderOpen, Info, Settings, Terminal } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
import EmptyState from '$lib/components/common/EmptyState.svelte';
import ErrorState from '$lib/components/common/ErrorState.svelte';
import LoadingState from '$lib/components/common/LoadingState.svelte';
import { t } from '$lib/i18n.svelte';
import { runScript, type ScriptEntry, scanScriptFolder } from '$lib/ipc/scripts';
import { toastStore } from '$lib/state/toast.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';
import { getErrorMessage } from '$lib/utils/format-error';
import { formatIpcError } from '$lib/utils/ipc-error';
import { widgetMenuItems } from '../_shared/menu-items';
import type { WidgetSortField, WidgetSortOrder } from '../_shared/types';

interface Props {
	widget?: WorkspaceWidget;
}

let { widget }: Props = $props();
let settingsOpen = $state(false);

interface WidgetConfig {
	watch_path?: string;
	scan_depth?: number;
	title?: string;
	description?: string;
	sort_field?: WidgetSortField;
	sort_order?: WidgetSortOrder;
	confirm_before_run?: boolean;
}

let config = $derived.by<WidgetConfig>(() => {
	if (!widget?.config) return {};
	try {
		return JSON.parse(widget.config) as WidgetConfig;
	} catch {
		return {};
	}
});

let entries = $state<ScriptEntry[]>([]);
let scanning = $state(false);
let scanError = $state<string | null>(null);
let descExpanded = $state(false);

let sortField = $derived<WidgetSortField>(config.sort_field ?? 'name');
let sortOrder = $derived<WidgetSortOrder>(config.sort_order ?? 'asc');
let confirmBeforeRun = $derived<boolean>(config.confirm_before_run ?? true);

let sortedEntries = $derived.by(() => {
	const list = [...entries];
	const dir = sortOrder === 'asc' ? 1 : -1;
	if (sortField === 'name') {
		list.sort((a, b) => dir * a.name.localeCompare(b.name, 'ja'));
	} else {
		list.sort((a, b) => dir * (a.mtimeMs - b.mtimeMs));
	}
	return list;
});

// shell 系拡張子は Terminal、その他コード系は FileCode アイコン。
const SHELL_EXTS = new Set(['bat', 'cmd', 'ps1', 'sh', 'bash', 'zsh', 'fish']);
function iconFor(ext: string) {
	return SHELL_EXTS.has(ext) ? Terminal : FileCode;
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

async function setSort(field: WidgetSortField) {
	const nextOrder: WidgetSortOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
	await persistConfig({ ...config, sort_field: field, sort_order: nextOrder });
}

// 古い path の async 結果が新 path に書き戻されないよう request id で stale response を破棄。
let scanRequestId = 0;
let prevPath: string | undefined;
let prevDepth: number | undefined;

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
	const path = config.watch_path;
	const depth = config.scan_depth ?? 2;
	if (path === prevPath && depth === prevDepth) return;
	prevPath = path;
	prevDepth = depth;
	entries = [];
	scanError = null;
	if (!path) {
		scanning = false;
		return;
	}
	void ensureWatchedPath(path);
	const myId = ++scanRequestId;
	scanning = true;
	scanScriptFolder(path, depth)
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

let confirmTarget = $state<ScriptEntry | null>(null);

function onScriptClick(entry: ScriptEntry) {
	if (confirmBeforeRun) {
		confirmTarget = entry;
	} else {
		void execute(entry);
	}
}

async function execute(entry: ScriptEntry) {
	const folder = config.watch_path;
	if (!folder) return;
	try {
		await runScript(folder, entry.path);
		toastStore.add(t('toast.launched_label', { label: entry.name }), 'success');
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: t('widgets.script_folder.op_run') }, e), 'error');
	}
}

let menuItems = $derived(widgetMenuItems(widget, () => (settingsOpen = true)));
</script>

<WidgetShell title={config.title || t('widgets.widget_label.script_folder')} icon={Terminal} {menuItems} path={config.watch_path}>
	<!-- PH-PQ-500: description は disclosure button。click で inline 展開
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
		<EmptyState
			icon={FolderOpen}
			title={t('widgets.script_folder.empty_title')}
			description={t('widgets.script_folder.empty_description')}
			action={{
				label: t('widgets.common.open_settings'),
				icon: Settings,
				onClick: () => (settingsOpen = true),
			}}
			testId="script-folder-empty-state"
		/>
	{:else if scanning}
		<LoadingState description={t('widgets.common.scanning')} testId="script-folder-loading-state" />
	{:else if scanError}
		<ErrorState
			title={t('widgets.common.load_failed')}
			description={scanError}
			testId="script-folder-error-state"
		/>
	{:else if entries.length === 0}
		<EmptyState
			icon={FileCode}
			title={t('widgets.script_folder.no_scripts')}
			testId="script-folder-no-scripts-state"
		/>
	{:else}
		<!-- 並び替え toolbar。 ag-sticky-bar で widget 本体 glass 面の継続にする
		     (独立した塗りつぶし矩形を持たない — border / shadow / 疑似要素なし)。
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
				aria-label={t('widgets.common.sort_by_name')}
			>
				{t('widgets.common.sort_name')}
				{#if sortField === 'name'}
					{#if sortOrder === 'asc'}<ArrowUp class="h-3 w-3" />{:else}<ArrowDown class="h-3 w-3" />{/if}
				{/if}
			</button>
			<button
				type="button"
				class="flex items-center gap-0.5 rounded px-1.5 py-0.5 transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)] {sortField ===
				'mtime'
					? 'bg-[var(--ag-surface-3)] text-[var(--ag-text-primary)]'
					: 'text-[var(--ag-text-secondary)]'}"
				onclick={() => void setSort('mtime')}
				aria-label={t('widgets.common.sort_by_mtime')}
			>
				{t('widgets.common.sort_mtime')}
				{#if sortField === 'mtime'}
					{#if sortOrder === 'asc'}<ArrowUp class="h-3 w-3" />{:else}<ArrowDown class="h-3 w-3" />{/if}
				{/if}
			</button>
		</div>
		<ul class="space-y-1">
			{#each sortedEntries as entry (entry.path)}
				{@const Icon = iconFor(entry.ext)}
				<li>
					<button
						type="button"
						class="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[var(--ag-text-primary)] transition-[background-color] duration-[var(--ag-duration-fast)] motion-reduce:transition-none hover:bg-[var(--ag-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ag-accent)]"
						aria-label={t('widgets.common.launch_label', { label: entry.name })}
						title={entry.path}
						onclick={() => onScriptClick(entry)}
					>
						<Icon class="h-4 w-4 shrink-0 text-[var(--ag-text-muted)]" />
						<span class="min-w-0 flex-1 truncate">{entry.name}</span>
						<span class="shrink-0 text-xs text-[var(--ag-text-faint)]">{entry.ext}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</WidgetShell>

<ConfirmDialog
	open={confirmTarget !== null}
	title={t('widgets.script_folder.confirm_run_title')}
	description={t('widgets.script_folder.confirm_run_desc', { name: confirmTarget?.name ?? '' })}
	confirmLabel={t('widgets.script_folder.confirm_run_button')}
	onConfirm={() => {
		const target = confirmTarget;
		confirmTarget = null;
		if (target) void execute(target);
	}}
	onCancel={() => (confirmTarget = null)}
/>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => (settingsOpen = false)} />
{/if}
