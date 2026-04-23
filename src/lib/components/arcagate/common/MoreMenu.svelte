<script lang="ts">
import { MoreHorizontal } from '@lucide/svelte';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

interface MenuItem {
	label: string;
	onclick: () => void;
}

interface Props {
	items: MenuItem[];
	ariaLabel: string;
}

let { items, ariaLabel }: Props = $props();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		class="rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface-4)] p-1.5 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-surface-3)]"
		aria-label={ariaLabel}
	>
		<MoreHorizontal class="h-4 w-4" />
	</DropdownMenu.Trigger>
	<DropdownMenu.Content>
		{#each items as item}
			<DropdownMenu.Item onclick={item.onclick}>
				{item.label}
			</DropdownMenu.Item>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
