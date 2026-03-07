<script lang="ts">
import { Cpu, FolderOpen, Gamepad2, Globe, LayoutDashboard, TerminalSquare } from '@lucide/svelte';
import type { Component } from 'svelte';
import SidebarRow from '$lib/components/arcagate/common/SidebarRow.svelte';
import { itemStore } from '$lib/state/items.svelte';
import QuickRegisterDropZone from './QuickRegisterDropZone.svelte';

interface Props {
	activeCategory: string | null;
	onSelectCategory?: (id: string | null) => void;
}

let { activeCategory, onSelectCategory }: Props = $props();

const iconMap: Record<string, Component> = {
	ゲーム: Gamepad2,
	開発ツール: Cpu,
	スクリプト: TerminalSquare,
	'URL / Web': Globe,
	フォルダ: FolderOpen,
};

$effect(() => {
	void itemStore.loadCategoryWithCounts();
});
</script>

<aside class="h-full border-r border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-4" data-testid="library-sidebar">
	<!-- Category list -->
	<div class="space-y-1.5">
		<SidebarRow
			icon={LayoutDashboard}
			label="すべて"
			meta={String(itemStore.items.length)}
			active={activeCategory === null}
			onclick={() => onSelectCategory?.(null)}
		/>
		{#each itemStore.categoryWithCounts as cat}
			<SidebarRow
				icon={iconMap[cat.name] ?? LayoutDashboard}
				label={cat.name}
				meta={String(cat.item_count)}
				active={activeCategory === cat.id}
				onclick={() => onSelectCategory?.(cat.id)}
			/>
		{/each}
	</div>

	<!-- Quick register drop zone -->
	<div class="mt-6">
		<QuickRegisterDropZone />
	</div>
</aside>
