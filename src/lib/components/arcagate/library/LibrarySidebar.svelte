<script lang="ts">
import { LayoutDashboard, Star } from '@lucide/svelte';
import SidebarRow from '$lib/components/arcagate/common/SidebarRow.svelte';
import { typeIconMap } from '$lib/constants/item-type';
import { t } from '$lib/i18n.svelte';
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
// U-3 (2026-05-12): workspace 名 system tag (sys-ws-*) を再導入 (旧 G-7 #410 撤去から復活)。
let workspaceTags = $derived(itemStore.tagWithCounts.filter((t) => t.id.startsWith('sys-ws-')));
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
				{t('library.sidebar.all_section')}
			</h3>
		{/if}
		<!-- 4/30 user 検収 C4: 旧実装は items.length (現在 load 済み件数) を表示 → タグ別 count
		     (DB 全件) と乖離 (例: フォルダ 114 / すべて 11)。libraryStats.total_items (全件数) に
		     統一してデータ整合性を確保。 -->
		<SidebarRow
			icon={NAV_TOP.library.icon}
			label={t('library.sidebar.all_label')}
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
				label={t('common.favorites')}
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
					{t('library.sidebar.type_section')}
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

	<!-- セクション 3: ワークスペース (U-3 で再導入)。 spec 上、 widget 経由で登録された
	     item は対応 workspace の sys-ws-<id> tag が付くため、 ここでフィルタ可能。 -->
	{#if workspaceTags.length > 0}
		<section
			class="space-y-1.5 border-t border-[var(--ag-border)] pt-3"
			data-testid="sidebar-section-workspace"
		>
			{#if expanded}
				<h3 class="px-2 text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">
					{t('library.sidebar.workspace_section')}
				</h3>
			{/if}
			{#each workspaceTags as tag (tag.id)}
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

	<!-- セクション 4: ユーザータグ -->
	{#if userTags.length > 0}
		<section
			class="space-y-1.5 border-t border-[var(--ag-border)] pt-3"
			data-testid="sidebar-section-user"
		>
			{#if expanded}
				<h3 class="px-2 text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">
					{t('library.sidebar.tag_section')}
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
