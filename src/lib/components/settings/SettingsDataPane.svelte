<script lang="ts">
import ExportImport from './ExportImport.svelte';
import PrivacySettings from './PrivacySettings.svelte';

/**
 * Settings のデータカテゴリ pane (ExportImport + PrivacySettings)。
 *
 * 引用元 guideline:
 *   docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、data pane 抽出)
 */
</script>

<div
	id="settings-panel-data"
	role="tabpanel"
	aria-labelledby="tab-data"
	class="space-y-4 px-6 py-5"
>
	<h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">データ</h3>
	<ExportImport />
	<PrivacySettings />
</div>
