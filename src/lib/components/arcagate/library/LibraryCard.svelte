<script lang="ts">
import { MoreHorizontal } from '@lucide/svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import { artMap, typeLabel } from '$lib/constants/item-type';
import type { Item } from '$lib/types/item';

interface Props {
	item: Item;
	onclick?: () => void;
	ondblclick?: () => void;
}

let { item, onclick, ondblclick }: Props = $props();
</script>

<button
	type="button"
	class="w-full overflow-hidden rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-left transition-opacity {item.is_enabled ? '' : 'opacity-40 grayscale'}"
	data-testid="library-card-{item.id}"
	{onclick}
	{ondblclick}
>
	<div class="relative flex h-28 items-center justify-center bg-gradient-to-br {artMap[item.item_type]}">
		<ItemIcon iconPath={item.icon_path} alt="{item.label} icon" class="h-14 w-14 object-contain drop-shadow-lg" />
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
				<div class="mt-1 truncate text-xs text-[var(--ag-text-muted)]">
					{item.target}
				</div>
			</div>
			<span
				class="rounded-full border border-[var(--ag-border)] bg-[var(--ag-surface-4)] px-2 py-1 text-[10px] text-[var(--ag-text-secondary)]"
			>
				{typeLabel[item.item_type]}
			</span>
		</div>
	</div>
</button>
