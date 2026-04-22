<script lang="ts">
import { LayoutDashboard, Settings2 } from '@lucide/svelte';
import SidebarRow from '$lib/components/arcagate/common/SidebarRow.svelte';
import { typeIconMap } from '$lib/constants/item-type';
import { itemStore } from '$lib/state/items.svelte';

interface Props {
	expanded?: boolean;
	activeTag: string | null;
	onSelectTag?: (id: string | null) => void;
	onOpenSettings?: () => void;
}

let { expanded = false, activeTag, onSelectTag, onOpenSettings }: Props = $props();

$effect(() => {
	void itemStore.loadTagWithCounts();
});
</script>

<aside
	class="flex h-full flex-col justify-between border-r border-[var(--ag-border)] bg-[var(--ag-surface-2)] py-3 {expanded ? 'px-3' : 'items-center px-1'}"
	data-testid="library-sidebar"
>
	<div class="space-y-1.5">
		<SidebarRow
			icon={LayoutDashboard}
			label="すべて"
			meta={expanded ? String(itemStore.items.length) : undefined}
			iconOnly={!expanded}
			active={activeTag === null}
			onclick={() => onSelectTag?.(null)}
		/>
		{#each itemStore.tagWithCounts as tag}
			<SidebarRow
				icon={typeIconMap[tag.name as keyof typeof typeIconMap] ?? LayoutDashboard}
				label={tag.name}
				meta={expanded ? String(tag.item_count) : undefined}
				iconOnly={!expanded}
				active={activeTag === tag.id}
				onclick={() => onSelectTag?.(tag.id)}
			/>
		{/each}
	</div>
	<div class="{expanded ? '' : 'flex justify-center'}">
		<button
			type="button"
			class="rounded-lg p-2 text-[var(--ag-text-muted)] transition-colors hover:bg-[var(--ag-surface-4)]"
			aria-label="設定"
			onclick={() => onOpenSettings?.()}
		>
			<Settings2 class="h-4 w-4" />
		</button>
	</div>
</aside>
