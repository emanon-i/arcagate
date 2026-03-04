<script lang="ts">
import { Shield } from '@lucide/svelte';
</script>

<!-- TODO: hiddenStore 接続 -->
<div
	class="space-y-3 rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-4"
>
	<div class="flex items-center gap-2 text-sm font-medium text-[var(--ag-text-primary)]">
		<Shield class="h-4 w-4" />
		センシティブ制御
	</div>
	<div
		class="flex items-center justify-between rounded-2xl bg-[var(--ag-surface-3)] px-3 py-2 text-sm text-[var(--ag-text-secondary)]"
	>
		<span>デフォルト非表示</span>
		<span
			class="rounded-full border border-[var(--ag-warm-border)] bg-[var(--ag-warm-bg)] px-2 py-1 text-[11px] text-[var(--ag-warm-text)]"
		>
			ON
		</span>
	</div>
	<div class="text-xs leading-5 text-[var(--ag-text-muted)]">
		ホットキーまたはパスワード入力で一時表示。配信・画面共有時の事故防止を優先。
	</div>
</div>
