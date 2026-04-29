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
import { CircleDot, FolderKanban, GitBranch, Settings } from '@lucide/svelte';
import { listen } from '@tauri-apps/api/event';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import EmptyState from '$lib/components/common/EmptyState.svelte';
import { autoRegisterFolderItems } from '$lib/ipc/items';
import { launchItem } from '$lib/ipc/launch';
import { getFolderItems, getGitStatus } from '$lib/ipc/workspace';
import { toastStore } from '$lib/state/toast.svelte';
import type { GitStatus } from '$lib/types/git';
import type { Item } from '$lib/types/item';
import { WIDGET_LABELS, type WorkspaceWidget } from '$lib/types/workspace';
import { formatLaunchError } from '$lib/utils/launch-error';
import { parseWidgetConfig } from '$lib/utils/widget-config';

interface Props {
	widget?: WorkspaceWidget;
	onItemContext?: (itemId: string, ev?: MouseEvent) => void;
}

let { widget, onItemContext }: Props = $props();

let folderItems = $state<Item[]>([]);
let gitStatuses = $state<Record<string, GitStatus>>({});
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
};

let config = $derived(parseWidgetConfig(widget?.config, PROJECT_CONFIG_DEFAULTS));

async function fetchGitStatuses(items: Item[], merge = false): Promise<void> {
	const entries: Record<string, GitStatus> = {};
	await Promise.all(
		items
			.filter((item) => item.item_type === 'folder')
			.map(async (item) => {
				try {
					entries[item.id] = await getGitStatus(item.target);
				} catch {
					// git なしフォルダはスキップ
				}
			}),
	);
	gitStatuses = merge ? { ...gitStatuses, ...entries } : entries;
}

// PH-issue-039 / 検収項目 #14 (仕様統一): config.watched_folder が変わったら scan を即時 reset + run。
// 旧実装は autoRegisterFolderItems を全 widget の任意 folder で呼んで結果を merge していたため
// 「同じ widget で folder 共有 (#11)」のように見えていた。本実装で widget config 経由のみに限定。
$effect(() => {
	const folder = config.watched_folder;
	folderItems = [];
	scanError = null;
	if (!folder) {
		scanning = false;
		return;
	}
	scanning = true;
	autoRegisterFolderItems(folder)
		.then(async (items) => {
			folderItems = items;
			await fetchGitStatuses(items);
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
		const newItems = await autoRegisterFolderItems(folder);
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

async function handleLaunch(item: Item) {
	try {
		await launchItem(item.id);
		toastStore.add(`${item.label} を起動しました`, 'success');
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
			title="監視フォルダを設定してください"
			description="設定モーダルで監視ルートを選ぶと、配下のフォルダがここに表示されます。"
			action={{
				label: '設定を開く',
				icon: Settings,
				onClick: () => (settingsOpen = true),
			}}
			testId="projects-empty-state"
		/>
	{:else if scanning}
		<p class="text-sm text-[var(--ag-text-muted)]">スキャン中…</p>
	{:else if scanError}
		<p class="text-sm text-[var(--ag-text-error)]">エラー: {scanError}</p>
	{:else if folderItems.length === 0}
		<p class="text-sm text-[var(--ag-text-muted)]">
			指定フォルダ内にサブフォルダがありません。
		</p>
	{:else}
		{#if config.description}
			<p class="mb-3 text-xs text-[var(--ag-text-muted)]">{config.description}</p>
		{/if}
		<!-- PH-issue-039 / 検収項目 #18: container query で widget 幅に応じて 1/2/3 列に動的調整。
		     PH-issue-039 / 検収項目 #17: 各 row のアイコンを削除 (folder 型では meaningless)。
		     git branch chip + 変更数 chip を保持 (P3 主要情報)。 -->
		<div class="@container">
			<div class="grid gap-2 @sm:grid-cols-2 @lg:grid-cols-3">
				{#each folderItems as item (item.id)}
					{@const gs = gitStatuses[item.id]}
					<button
						type="button"
						class="rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] p-3 text-left transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)]"
						aria-label="{item.label} を起動 (右クリックで詳細)"
						title={item.target}
						onclick={() => void handleLaunch(item)}
						oncontextmenu={(e) => {
							if (onItemContext) {
								e.preventDefault();
								onItemContext(item.id, e);
							}
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
										title="{gs.changed_count} 件の変更"
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
