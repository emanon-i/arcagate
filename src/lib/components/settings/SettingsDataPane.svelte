<script lang="ts">
import ExportImport from './ExportImport.svelte';

/**
 * Settings のデータカテゴリ pane (ExportImport)。
 *
 * D-15: PrivacySettings (Telemetry / Crash opt-in) は削除 (機能ごと撤去、PostHog
 * 配線済の dead code を解消)。
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
</div>
