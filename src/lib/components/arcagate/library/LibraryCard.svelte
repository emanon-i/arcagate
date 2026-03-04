<script lang="ts">
import { MoreHorizontal } from '@lucide/svelte';
import type { MockItem } from '$lib/mock/arcagate/items';

interface Props {
	item: MockItem;
	onclick?: () => void;
}

let { item, onclick }: Props = $props();
</script>

<!-- TODO: LibraryCard グラデーション U-02 で配色ロジック決定 -->
<button
	type="button"
	class="w-full overflow-hidden rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-left"
	{onclick}
>
	<div class="relative h-28 bg-gradient-to-br {item.art}">
		<div
			class="absolute right-3 top-3 rounded-xl border border-white/15 bg-black/20 p-1.5 text-white/70"
		>
			<MoreHorizontal class="h-4 w-4" />
		</div>
	</div>
	<div class="space-y-3 p-4">
		<div class="flex items-start justify-between gap-3">
			<div>
				<div class="text-sm font-semibold text-[var(--ag-text-primary)]">{item.label}</div>
				<div class="mt-1 text-xs text-[var(--ag-text-muted)]">
					{item.source} · {item.item_type}
				</div>
			</div>
			<span
				class="rounded-full border border-[var(--ag-border)] bg-[var(--ag-surface-4)] px-2 py-1 text-[10px] text-[var(--ag-text-secondary)]"
			>
				{item.badge}
			</span>
		</div>
		<div class="flex items-center justify-between text-xs text-[var(--ag-text-muted)]">
			<span>起動 {item.launch_count}回</span>
			<span>{item.last_launched}</span>
		</div>
	</div>
</button>
