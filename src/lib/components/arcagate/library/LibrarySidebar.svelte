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
// G-7 (2026-05-09 user 検収): workspace 名 system tag (sys-ws-*) 機能ごと撤去。sidebar セクションも撤去。
let userTags = $derived(itemStore.tagWithCounts.filter((t) => !t.is_system));
</script>

<aside
	class="flex h-full flex-col gap-3 overflow-y-auto border-r border-[var(--ag-border)] bg-[var(--ag-surface-2)] py-3 {expanded ? 'px-3' : 'items-center px-1'}"
	data-testid="library-sidebar"
>
	<!-- セクション 1: 全体 -->
	<section class="space-y-1.5" data-testid="sidebar-section-all">
		{#if expanded}
			<h3 class="px-2 text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">
				ライブラリ全体
			</h3>
		{/if}
		<!-- 4/30 user 検収 C4: 旧実装は items.length (現在 load 済み件数) を表示 → タグ別 count
		     (DB 全件) と乖離 (例: フォルダ 114 / すべて 11)。libraryStats.total_items (全件数) に
		     統一してデータ整合性を確保。 -->
		<SidebarRow
			icon={NAV_TOP.library.icon}
			label="すべて"
			meta={expanded
				? String(itemStore.libraryStats?.total_items ?? itemStore.items.length)
				: undefined}
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
				<h3 class="px-2 text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">
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

	<!-- G-7: 旧セクション 3「ワークスペース」 (sys-ws-* tag) は機能ごと撤去。 -->

	<!-- セクション 3: ユーザータグ -->
	{#if userTags.length > 0}
		<section
			class="space-y-1.5 border-t border-[var(--ag-border)] pt-3"
			data-testid="sidebar-section-user"
		>
			{#if expanded}
				<h3 class="px-2 text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">
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
