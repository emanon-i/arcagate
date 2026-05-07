<script lang="ts">
import LibraryCardSettings from './LibraryCardSettings.svelte';
import OpenerSettings from './OpenerSettings.svelte';

/**
 * Settings のライブラリカテゴリ pane (LibraryCardSettings + OpenerSettings)。
 *
 * 引用元 guideline:
 *   docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、library pane 抽出)
 *
 * B-8 #16 (#364): Settings pane から WatchedFoldersSettings の mount を削除。
 * Phase 2 完遂 (2026-05-07、本 PR): WatchedFoldersSettings.svelte ファイル自体を削除。
 * 取り込みフォルダの管理は ExeFolder / Projects widget の追加 / 削除に統一
 * (widget add → ensureWatchedPath で自動登録 / widget delete → cascade で
 * 同 path を使う他 widget が無ければ自動解除)。
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
