<script lang="ts">
import { Lock } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import { hiddenStore } from '$lib/state/hidden.svelte';

$effect(() => {
	void hiddenStore.loadHiddenCount();
});
</script>

<WidgetShell title="Visibility" icon={Lock}>
	<div class="space-y-3 text-sm text-[var(--ag-text-secondary)]">
		<div class="flex items-center justify-between rounded-2xl bg-[var(--ag-surface-3)] px-3 py-2.5">
			<span>非表示アイテム</span>
			<span class="text-[var(--ag-warm-text)]">{hiddenStore.hiddenCount} 件</span>
		</div>
		<button
			type="button"
			class="flex w-full items-center justify-between rounded-2xl bg-[var(--ag-surface-3)] px-3 py-2.5 hover:bg-[var(--ag-surface-4)] transition-colors"
			onclick={() => hiddenStore.toggleDirect()}
		>
			<span>一時表示</span>
			<span class={hiddenStore.isHiddenVisible ? 'text-[var(--ag-warm-text)]' : 'text-[var(--ag-success-text)]'}>
				{hiddenStore.isHiddenVisible ? 'ON' : 'OFF'}
			</span>
		</button>
		<div
			class="rounded-2xl border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-3 text-xs leading-5 text-[var(--ag-text-muted)]"
		>
			ストリーミング・会議前にまとめて隠せる導線を明示。
		</div>
	</div>
</WidgetShell>
