<script lang="ts">
import DetailRow from '$lib/components/arcagate/common/DetailRow.svelte';
import Tip from '$lib/components/arcagate/common/Tip.svelte';
</script>

<!-- TODO: derive from currently selected PaletteResult instead of hardcoded mock -->
<div class="space-y-4 rounded-[24px] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-4">
	<div>
		<div class="text-xs uppercase tracking-[0.16em] text-[var(--ag-text-muted)]">Quick context</div>
		<div class="mt-2 text-sm font-medium text-[var(--ag-text-primary)]">Claude Code</div>
		<div class="mt-1 text-sm leading-6 text-[var(--ag-text-secondary)]">
			PowerShell 経由で起動。作業ディレクトリと profile をプリセット化できます。
		</div>
	</div>

	<div class="space-y-2 text-sm">
		<DetailRow label="カテゴリ" value="Scripts" />
		<DetailRow label="別名" value="cla / code" />
		<DetailRow label="最終起動" value="3分前" />
		<DetailRow label="起動回数" value="94" />
	</div>

	<Tip tone="success" tipId="palette-shortcut-hint">
		ショートカットや別名を登録すると、数文字で目的のアプリに到達できます。
	</Tip>
</div>
