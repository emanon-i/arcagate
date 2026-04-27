<script lang="ts">
import { LayoutDashboard, Star } from '@lucide/svelte';
import SidebarRow from '$lib/components/arcagate/common/SidebarRow.svelte';
import { typeIconMap } from '$lib/constants/item-type';
import { NAV_TOP } from '$lib/nav-items';
import { itemStore } from '$lib/state/items.svelte';

interface Props {
	expanded?: boolean;
	activeTag: string | null;
	onSelectTag?: (id: string | null) => void;
}

let { expanded = false, activeTag, onSelectTag }: Props = $props();

$effect(() => {
	void itemStore.loadTagWithCounts();
});

let starredTags = $derived(itemStore.tagWithCounts.filter((t) => t.id === 'sys-starred'));
let typeTags = $derived(itemStore.tagWithCounts.filter((t) => t.id.startsWith('sys-type-')));
let workspaceTags = $derived(itemStore.tagWithCounts.filter((t) => t.id.startsWith('sys-ws-')));
let userTags = $derived(itemStore.tagWithCounts.filter((t) => !t.is_system));
</script>

<aside
	class="flex h-full flex-col gap-3 overflow-y-auto [scrollbar-gutter:stable] border-r border-[var(--ag-border)] bg-[var(--ag-surface-2)] py-3 {expanded ? 'px-3' : 'items-center px-1'}"
	data-testid="library-sidebar"
>
	<!-- セクション 1: 全体 -->
	<section class="space-y-1.5" data-testid="sidebar-section-all">
		{#if expanded}
			<h3 class="px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">
				ライブラリ全体
			</h3>
		{/if}
		<SidebarRow
			icon={NAV_TOP.library.icon}
			label="すべて"
			meta={expanded ? String(itemStore.items.length) : undefined}
			iconOnly={!expanded}
			active={activeTag === null}
			onclick={() => onSelectTag?.(null)}
		/>
		{#each starredTags as tag (tag.id)}
			<SidebarRow
				icon={Star}
				label="お気に入り"
				meta={expanded ? String(tag.item_count) : undefined}
				iconOnly={!expanded}
				active={activeTag === tag.id}
				onclick={() => onSelectTag?.(tag.id)}
			/>
		{/each}
	</section>

	<!-- セクション 2: タイプ別 -->
	{#if typeTags.length > 0}
		<section
			class="space-y-1.5 border-t border-[var(--ag-border)] pt-3"
			data-testid="sidebar-section-type"
		>
			{#if expanded}
				<h3 class="px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">
					タイプ
				</h3>
			{/if}
			{#each typeTags as tag (tag.id)}
				<SidebarRow
					icon={typeIconMap[tag.name as keyof typeof typeIconMap] ?? LayoutDashboard}
					label={tag.name}
					meta={expanded ? String(tag.item_count) : undefined}
					iconOnly={!expanded}
					active={activeTag === tag.id}
					onclick={() => onSelectTag?.(tag.id)}
				/>
			{/each}
		</section>
	{/if}

	<!-- セクション 3: ワークスペース -->
	{#if workspaceTags.length > 0}
		<section
			class="space-y-1.5 border-t border-[var(--ag-border)] pt-3"
			data-testid="sidebar-section-workspace"
		>
			{#if expanded}
				<h3 class="px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">
					ワークスペース
				</h3>
			{/if}
			{#each workspaceTags as tag (tag.id)}
				<SidebarRow
					icon={NAV_TOP.workspace.icon}
					label={tag.name}
					meta={expanded ? String(tag.item_count) : undefined}
					iconOnly={!expanded}
					active={activeTag === tag.id}
					onclick={() => onSelectTag?.(tag.id)}
				/>
			{/each}
		</section>
	{/if}

	<!-- セクション 4: ユーザータグ -->
	{#if userTags.length > 0}
		<section
			class="space-y-1.5 border-t border-[var(--ag-border)] pt-3"
			data-testid="sidebar-section-user"
		>
			{#if expanded}
				<h3 class="px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">
					タグ
				</h3>
			{/if}
			{#each userTags as tag (tag.id)}
				<SidebarRow
					icon={LayoutDashboard}
					label={tag.name}
					meta={expanded ? String(tag.item_count) : undefined}
					iconOnly={!expanded}
					active={activeTag === tag.id}
					onclick={() => onSelectTag?.(tag.id)}
				/>
			{/each}
		</section>
	{/if}
</aside>
