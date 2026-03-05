<script lang="ts">
import MoreMenu from '$lib/components/arcagate/common/MoreMenu.svelte';
import Tip from '$lib/components/arcagate/common/Tip.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import type { WidgetType } from '$lib/types/workspace';
import FavoritesWidget from './FavoritesWidget.svelte';
import PageTabBar from './PageTabBar.svelte';
import ProjectsWidget from './ProjectsWidget.svelte';
import QuickActionsWidget from './QuickActionsWidget.svelte';
import RecentLaunchesWidget from './RecentLaunchesWidget.svelte';
import ThemeControlsWidget from './ThemeControlsWidget.svelte';
import VisibilityWidget from './VisibilityWidget.svelte';
import WatchFoldersWidget from './WatchFoldersWidget.svelte';

$effect(() => {
	void workspaceStore.loadWorkspaces();
});

function handleSelectWorkspace(id: string) {
	void workspaceStore.selectWorkspace(id);
}

function handleAddWidget(type: WidgetType) {
	void workspaceStore.addWidget(type);
}

function handleRenameWorkspace() {
	const ws = workspaceStore.workspaces.find((w) => w.id === workspaceStore.activeWorkspaceId);
	if (!ws) return;
	const newName = prompt('ワークスペース名を入力', ws.name);
	if (newName && newName !== ws.name) {
		void workspaceStore.updateWorkspace(ws.id, newName);
	}
}

const workspaceMenuItems = [
	{ label: 'Favorites 追加', onclick: () => handleAddWidget('favorites') },
	{ label: 'Recent 追加', onclick: () => handleAddWidget('recent') },
	{ label: 'Projects 追加', onclick: () => handleAddWidget('projects') },
	{ label: 'Watch Folders 追加', onclick: () => handleAddWidget('watched_folders') },
	{ label: '名前変更', onclick: handleRenameWorkspace },
];

const widgetComponents = {
	favorites: FavoritesWidget,
	recent: RecentLaunchesWidget,
	projects: ProjectsWidget,
	watched_folders: WatchFoldersWidget,
} as const;
</script>

<div class="min-h-[780px] bg-[linear-gradient(180deg,var(--ag-surface-0)_0%,var(--ag-surface-page)_100%)] p-5">
	<div class="mb-5 flex items-center gap-2">
		<div class="flex-1">
			<PageTabBar onSelectWorkspace={handleSelectWorkspace} />
		</div>
		<MoreMenu items={workspaceMenuItems} ariaLabel="ワークスペース操作メニュー" />
	</div>

	<div class="mb-4">
		<Tip tone="accent" tipId="workspace-home-tip">
			このページはホームです。よく使うものをまとめて配置できます。
		</Tip>
	</div>

	{#if workspaceStore.widgets.length > 0}
		<!-- Dynamic widget rendering from store -->
		<div class="grid gap-4 lg:grid-cols-12">
			<div class="space-y-4 lg:col-span-3">
				{#each workspaceStore.widgets.filter((w) => w.widget_type === 'favorites') as widget (widget.id)}
					<FavoritesWidget />
				{/each}
				<VisibilityWidget />
			</div>

			<div class="space-y-4 lg:col-span-6">
				{#each workspaceStore.widgets.filter((w) => w.widget_type === 'recent') as widget (widget.id)}
					<RecentLaunchesWidget />
				{/each}
				{#each workspaceStore.widgets.filter((w) => w.widget_type === 'projects') as widget (widget.id)}
					<ProjectsWidget />
				{/each}
				{#each workspaceStore.widgets.filter((w) => w.widget_type === 'watched_folders') as widget (widget.id)}
					<WatchFoldersWidget />
				{/each}
			</div>

			<div class="space-y-4 lg:col-span-3">
				<QuickActionsWidget />
				<ThemeControlsWidget />
			</div>
		</div>
	{:else if workspaceStore.workspaces.length === 0}
		<div class="flex items-center justify-center py-20">
			<p class="text-sm text-[var(--ag-text-muted)]">ワークスペースがまだありません</p>
		</div>
	{:else}
		<!-- Default layout when no widgets are configured -->
		<div class="grid gap-4 lg:grid-cols-12">
			<div class="space-y-4 lg:col-span-3">
				<FavoritesWidget />
				<VisibilityWidget />
			</div>
			<div class="space-y-4 lg:col-span-6">
				<RecentLaunchesWidget />
				<ProjectsWidget />
				<WatchFoldersWidget />
			</div>
			<div class="space-y-4 lg:col-span-3">
				<QuickActionsWidget />
				<ThemeControlsWidget />
			</div>
		</div>
	{/if}
</div>
