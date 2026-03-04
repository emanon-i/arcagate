<script lang="ts">
import Tip from '$lib/components/arcagate/common/Tip.svelte';
import FavoritesWidget from './FavoritesWidget.svelte';
import PageTabBar from './PageTabBar.svelte';
import ProjectsWidget from './ProjectsWidget.svelte';
import QuickActionsWidget from './QuickActionsWidget.svelte';
import RecentLaunchesWidget from './RecentLaunchesWidget.svelte';
import ThemeControlsWidget from './ThemeControlsWidget.svelte';
import VisibilityWidget from './VisibilityWidget.svelte';
import WatchFoldersWidget from './WatchFoldersWidget.svelte';

let activeWorkspace = $state('Today');
let currentTheme = $state<'dark' | 'light'>('dark');

function toggleTheme() {
	currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
	if (currentTheme === 'dark') {
		document.documentElement.classList.add('dark');
	} else {
		document.documentElement.classList.remove('dark');
	}
}

// TODO: テーマ初期値をバックエンド (cmd_get_theme) から取得する
// TODO: ワークスペース切替時にウィジェット構成をバックエンドから再取得する
</script>

<div class="min-h-[780px] bg-[linear-gradient(180deg,var(--ag-surface-0)_0%,var(--ag-surface-page)_100%)] p-5">
	<div class="mb-5">
		<PageTabBar
			{activeWorkspace}
			{currentTheme}
			onSelectWorkspace={(name) => (activeWorkspace = name)}
			onToggleTheme={toggleTheme}
		/>
	</div>

	<div class="mb-4">
		<Tip tone="accent" tipId="workspace-home-tip">
			このページはホームです。よく使うものをまとめて配置できます。
		</Tip>
	</div>

	<div class="grid gap-4 lg:grid-cols-12">
		<!-- Left column: Favorites + Visibility -->
		<div class="space-y-4 lg:col-span-3">
			<FavoritesWidget />
			<VisibilityWidget />
		</div>

		<!-- Center column: Recent + Projects + Watch folders -->
		<div class="space-y-4 lg:col-span-6">
			<RecentLaunchesWidget />
			<ProjectsWidget />
			<WatchFoldersWidget />
		</div>

		<!-- Right column: Quick actions + Theme controls -->
		<div class="space-y-4 lg:col-span-3">
			<QuickActionsWidget />
			<ThemeControlsWidget {currentTheme} onToggleTheme={toggleTheme} />
		</div>
	</div>
</div>
