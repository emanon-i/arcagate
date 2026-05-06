<script lang="ts">
import LibraryCardSettings from './LibraryCardSettings.svelte';
import OpenerSettings from './OpenerSettings.svelte';

/**
 * Settings のライブラリカテゴリ pane (LibraryCardSettings + OpenerSettings)。
 *
 * B-8 #16: WatchedFoldersSettings は削除 (Workspace の Folder Watcher Widget で同機能あり、
 * 重複 UI 排除)。component file は keep (widget 内 settings 等で再利用可能性あり)、
 * Settings pane からの mount のみ削除。
 */
</script>

<div
	id="settings-panel-library"
	role="tabpanel"
	aria-labelledby="tab-library"
	class="space-y-6 px-6 py-5"
>
	<h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">
		ライブラリ
	</h3>
	<LibraryCardSettings />
	<div class="border-t border-[var(--ag-border)] pt-5">
		<OpenerSettings />
	</div>
</div>
