<script lang="ts">
import { Star } from '@lucide/svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import { artMap, typeLabel } from '$lib/constants/item-type';
import type { Item } from '$lib/types/item';

interface Props {
	item: Item;
	isStarred?: boolean;
	onclick?: () => void;
	ondblclick?: () => void;
}

let { item, isStarred = false, onclick, ondblclick }: Props = $props();
</script>

<button
	type="button"
	class="w-full overflow-hidden rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-left transition-all hover:border-[var(--ag-border-hover)] hover:bg-[var(--ag-surface-4)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ag-surface-0)] {item.is_enabled ? '' : 'opacity-40 grayscale'}"
	data-testid="library-card-{item.id}"
	{onclick}
	{ondblclick}
>
	<div class="relative flex aspect-video items-center justify-center bg-gradient-to-br {artMap[item.item_type]}">
		<ItemIcon iconPath={item.icon_path} itemType={item.item_type} alt="{item.label} icon" class="h-14 w-14 object-contain drop-shadow-lg" />
		{#if isStarred}
			<div class="absolute right-2 top-2 rounded-full bg-[var(--ag-accent)]/90 p-1 shadow-sm">
				<Star class="h-3 w-3 fill-white text-white" />
			</div>
		{/if}
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
