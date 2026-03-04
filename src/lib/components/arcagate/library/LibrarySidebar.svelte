<script lang="ts">
import SidebarRow from '$lib/components/arcagate/common/SidebarRow.svelte';
import Tip from '$lib/components/arcagate/common/Tip.svelte';
import { mockCategories } from '$lib/mock/arcagate/items';
import QuickRegisterDropZone from './QuickRegisterDropZone.svelte';

// TODO: カテゴリフィルタリングを Service 経由で接続
let activeCategory = $state('すべて');
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
		{#each mockCategories as cat}
			<SidebarRow
				icon={cat.icon}
				label={cat.label}
				meta={String(cat.count)}
				active={activeCategory === cat.label}
				onclick={() => (activeCategory = cat.label)}
			/>
		{/each}
	</div>

	<!-- Quick register drop zone -->
	<div class="mt-6">
		<QuickRegisterDropZone />
	</div>
</aside>
