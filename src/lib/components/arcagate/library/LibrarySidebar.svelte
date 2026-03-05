<script lang="ts">
import { Cpu, FolderOpen, Gamepad2, Globe, LayoutDashboard, TerminalSquare } from '@lucide/svelte';
import type { Component } from 'svelte';
import SidebarRow from '$lib/components/arcagate/common/SidebarRow.svelte';
import Tip from '$lib/components/arcagate/common/Tip.svelte';
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

<aside class="border-r border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-4">
	<!-- Profile box -->
	<div
		class="mb-4 flex items-center gap-3 rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] p-3"
	>
		<div
			class="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 font-semibold text-white"
		>
			A
		</div>
		<div>
			<div class="text-sm font-semibold text-[var(--ag-text-primary)]">Items</div>
			<div class="text-xs text-[var(--ag-text-muted)]">Registry</div>
		</div>
	</div>

	<Tip tone="accent" tipId="library-sidebar-intro">
		ここでアイテムを登録・整理します。Workspace にはよく使うものを配置できます。
	</Tip>

	<!-- Category list -->
	<div class="mt-4 space-y-1.5">
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
