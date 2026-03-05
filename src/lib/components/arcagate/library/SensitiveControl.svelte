<script lang="ts">
import { Shield } from '@lucide/svelte';
import { hiddenStore } from '$lib/state/hidden.svelte';
</script>

<div
	class="space-y-3 rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-4"
>
	<div class="flex items-center gap-2 text-sm font-medium text-[var(--ag-text-primary)]">
		<Shield class="h-4 w-4" />
		センシティブ制御
	</div>
	<button
		type="button"
		class="flex w-full items-center justify-between rounded-2xl bg-[var(--ag-surface-3)] px-3 py-2 text-sm text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)] transition-colors"
		onclick={() => hiddenStore.toggleDirect()}
	>
		<span>デフォルト非表示</span>
		<span
			class="rounded-full border px-2 py-1 text-[11px] {hiddenStore.isHiddenVisible
				? 'border-[var(--ag-success-border)] bg-[var(--ag-success-bg)] text-[var(--ag-success-text)]'
				: 'border-[var(--ag-warm-border)] bg-[var(--ag-warm-bg)] text-[var(--ag-warm-text)]'}"
		>
			{hiddenStore.isHiddenVisible ? 'OFF' : 'ON'}
		</span>
	</button>
	<div class="text-xs leading-5 text-[var(--ag-text-muted)]">
		ホットキーまたはパスワード入力で一時表示。配信・画面共有時の事故防止を優先。
	</div>
</div>
