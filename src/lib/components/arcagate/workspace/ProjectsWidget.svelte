<script lang="ts">
import { CircleDot, Eye, FolderKanban, GitBranch } from '@lucide/svelte';
import { listen } from '@tauri-apps/api/event';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import { autoRegisterFolderItems } from '$lib/ipc/items';
import { launchItem } from '$lib/ipc/launch';
import { getWatchedPaths } from '$lib/ipc/watched_paths';
import { getFolderItems, getGitStatus } from '$lib/ipc/workspace';
import type { GitStatus } from '$lib/types/git';
import type { Item } from '$lib/types/item';
import type { WatchedPath } from '$lib/types/watched_path';
import type { WorkspaceWidget } from '$lib/types/workspace';
import { parseWidgetConfig } from '$lib/utils/widget-config';
import WidgetSettingsDialog from './WidgetSettingsDialog.svelte';

interface Props {
	widget?: WorkspaceWidget;
	onItemContext?: (itemId: string) => void;
}

let { widget, onItemContext }: Props = $props();

let folderItems = $state<Item[]>([]);
let watchedPaths = $state<WatchedPath[]>([]);
let gitStatuses = $state<Record<string, GitStatus>>({});
let settingsOpen = $state(false);

const PROJECT_CONFIG_DEFAULTS = {
	max_items: 10,
	git_poll_interval_sec: 60,
	title: 'ウォッチフォルダー',
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

$effect(() => {
	async function loadData() {
		const items = await getFolderItems();
		folderItems = items;
		void fetchGitStatuses(items);

		if (config.auto_add && config.watched_folder) {
			const newItems = await autoRegisterFolderItems(config.watched_folder);
			if (newItems.length > 0) {
				const existingIds = new Set(items.map((i) => i.id));
				const merged = [...items, ...newItems.filter((i) => !existingIds.has(i.id))];
				folderItems = merged;
				void fetchGitStatuses(newItems, true);
			}
		}
	}
	void loadData();
	void getWatchedPaths().then((paths) => {
		watchedPaths = paths;
	});
});

// ポーリング
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
		// 監視対象フォルダの直下のディレクトリのみ対象（子孫は除く）
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

<WidgetShell title={config.title} icon={GitBranch} {menuItems}>
	{#if config.description}
		<p class="mb-3 text-xs text-[var(--ag-text-muted)]">{config.description}</p>
	{/if}
	<div class="grid gap-3 md:grid-cols-3">
		{#each folderItems as item (item.id)}
			{@const gs = gitStatuses[item.id]}
			<button
				type="button"
				class="rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] p-4 text-left transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)]"
				onclick={() => void launchItem(item.id)}
				oncontextmenu={(e) => {
					if (onItemContext) {
						e.preventDefault();
						onItemContext(item.id);
					}
				}}
			>
				<div class="mb-2 flex items-center justify-between">
					<div class="text-sm font-semibold text-[var(--ag-text-primary)]">{item.label}</div>
					<ItemIcon iconPath={item.icon_path} alt="{item.label} icon" class="h-6 w-6 shrink-0 object-cover" />
				</div>
				<div class="truncate text-xs text-[var(--ag-text-muted)]">{item.target}</div>
				{#if gs}
					<div class="mt-2 flex items-center gap-2 text-xs text-[var(--ag-text-secondary)]">
						<GitBranch class="h-3.5 w-3.5" />
						<span class="truncate">{gs.branch}</span>
						{#if gs.has_changes}
							<span
								class="flex items-center gap-0.5 text-[var(--ag-warm-text)]"
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

	{#if watchedPaths.length > 0}
		<div class="mt-4 border-t border-[var(--ag-border)] pt-3">
			<div class="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--ag-text-muted)]">
				<Eye class="h-3.5 w-3.5" />
				監視フォルダ
			</div>
			<div class="space-y-1">
				{#each watchedPaths as wp (wp.id)}
					<div class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-[var(--ag-text-secondary)]">
						<FolderKanban class="h-3.5 w-3.5 text-[var(--ag-text-faint)]" />
						<span class="truncate">{wp.label || wp.path}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if folderItems.length === 0 && watchedPaths.length === 0}
		<div class="py-4 text-center text-xs text-[var(--ag-text-muted)]">
			フォルダ型アイテムがここに表示されます
		</div>
	{/if}
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => { settingsOpen = false; }} />
{/if}
