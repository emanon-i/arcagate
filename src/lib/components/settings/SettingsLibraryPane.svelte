<script lang="ts">
import LibraryCardSettings from './LibraryCardSettings.svelte';
import OpenerSettings from './OpenerSettings.svelte';
import WatchedFoldersSettings from './WatchedFoldersSettings.svelte';

/**
 * Settings のライブラリカテゴリ pane (LibraryCardSettings + WatchedFoldersSettings + OpenerSettings)。
 *
 * 引用元 guideline:
 *   docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、library pane 抽出)
 *
 * agent judgment: a3 元提案 "SettingsOpenerPane" は既存 OpenerSettings component で達成済の
 * ため独立 pane を作らず、library category 単位の pane で関連 settings を集約。
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
