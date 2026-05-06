<script lang="ts">
import LibraryCardSettings from './LibraryCardSettings.svelte';
import OpenerSettings from './OpenerSettings.svelte';
import WatchedFoldersSettings from './WatchedFoldersSettings.svelte';

/**
 * Settings のライブラリカテゴリ pane (LibraryCardSettings + WatchedFoldersSettings + OpenerSettings)。
 *
 * C-12 #12 audit 結論で B-8 削除を revert: WatchedFoldersSettings は **ファイル変更追跡機能の
 * 唯一の UI 入り口** (cmd_add_watched_path 経由で recursive watcher 登録)。Workspace の Folder
 * Watcher Widget は別機能 (project listing、watched_paths とは独立)。user の「重複」認識は誤りで
 * 削除すると追跡 UI が完全に消える。
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
		<WatchedFoldersSettings />
	</div>
	<div class="border-t border-[var(--ag-border)] pt-5">
		<OpenerSettings />
	</div>
</div>
