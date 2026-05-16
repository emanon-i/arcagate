<script lang="ts">
import { ChevronRight, Search, X as XIcon } from '@lucide/svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import { t } from '$lib/i18n.svelte';
import type { Item } from '$lib/types/item';
import type { WidgetSortField } from '$lib/types/widget-configs';

interface Props {
	items: Item[];
	sortField?: WidgetSortField;
	iconClass?: string;
	showTarget?: boolean;
	onLaunch: (id: string) => void;
	/** PH-issue-024: ev を受け取って context menu の position を取れるよう拡張。 */
	onContext?: (id: string, ev?: MouseEvent) => void;
	emptyMessage?: string;
}

let {
	items,
	sortField = 'default',
	iconClass = 'h-5 w-5 shrink-0 object-cover',
	showTarget = false,
	onLaunch,
	onContext,
	emptyMessage = '',
}: Props = $props();

let searchQuery = $state('');
let searchVisible = $state(false);

let displayItems = $derived.by(() => {
	let list = items;
	if (searchQuery.trim()) {
		const q = searchQuery.toLowerCase();
		list = list.filter((i) => i.label.toLowerCase().includes(q));
	}
	if (sortField === 'name') {
		list = [...list].sort((a, b) => a.label.localeCompare(b.label, 'ja'));
	}
	return list;
});

function toggleSearch() {
	searchVisible = !searchVisible;
	if (!searchVisible) searchQuery = '';
}
</script>

<div class="flex flex-col gap-2">
	{#if searchVisible}
		<div class="flex items-center gap-1 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2 py-1">
			<Search class="h-3.5 w-3.5 shrink-0 text-[var(--ag-text-muted)]" />
			<!-- svelte-ignore a11y_autofocus -->
			<input
				type="text"
				class="min-w-0 flex-1 bg-transparent text-xs text-[var(--ag-text-primary)] outline-none placeholder:text-[var(--ag-text-faint)]"
				placeholder={t('workspace.item_list.filter_placeholder')}
				autofocus
				autocomplete="off"
				bind:value={searchQuery}
			/>
			<button
				type="button"
				class="rounded p-0.5 text-[var(--ag-text-muted)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none"
				onclick={toggleSearch}
				aria-label={t('workspace.item_list.close_search')}
			>
				<XIcon class="h-3 w-3" />
			</button>
		</div>
	{:else}
		<div class="flex justify-end">
			<button
				type="button"
				class="rounded p-0.5 text-[var(--ag-text-faint)] transition-colors duration-[var(--ag-duration-fast)] hover:text-[var(--ag-text-muted)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ag-accent)]"
				onclick={toggleSearch}
				aria-label={t('workspace.item_list.search_aria')}
			>
				<Search class="h-3.5 w-3.5" />
			</button>
		</div>
	{/if}

	<!-- PH-widget-polish: aria-label / title 追加で a11y、hover で Chevron 強調、
	     group hover でテキスト色強調 (P1 操作可視化、Favorites / Recent 等の起動 row)。
	     J-3 (2026-05-12): @container query で wide widget で multi-column 化。
	     widget resize maxSpan=12 まで広がるので、単列だと item が横に間延びする問題を回避。
	     audit batch (2026-05-13) #9: items.length === 1 だと multi-col grid で
	     単体 item が 1/N 幅に shrink される bug。 1 件のときは grid-cols-1 を強制。 -->
	<div class="@container">
		<div
			class={displayItems.length <= 1
				? 'grid gap-1.5 grid-cols-1'
				: 'grid gap-1.5 @md:grid-cols-2 @[28rem]:grid-cols-3 @[40rem]:grid-cols-4'}
		>
			{#each displayItems as item (item.id)}
				<button
					type="button"
					class="group/row flex w-full min-w-0 items-center justify-between rounded-2xl bg-[var(--ag-surface-3)] px-3 py-2.5 text-sm text-[var(--ag-text-secondary)] transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)] hover:text-[var(--ag-text-primary)]"
					aria-label={t('workspace.item_list.launch_label', { label: item.label })}
					title={showTarget ? item.target : item.label}
					onclick={() => onLaunch(item.id)}
					oncontextmenu={(e) => {
						if (onContext) {
							e.preventDefault();
							onContext(item.id, e);
						}
					}}
				>
					<span class="flex min-w-0 flex-1 items-center gap-2">
						<ItemIcon iconPath={item.icon_path} alt="{item.label} icon" class={iconClass} />
						<span class="min-w-0 flex-1 truncate text-left">{item.label}</span>
					</span>
					{#if showTarget}
						<span class="shrink-0 max-w-[40%] truncate text-xs text-[var(--ag-text-muted)]">{item.target}</span>
					{:else}
						<ChevronRight
							class="h-4 w-4 shrink-0 text-[var(--ag-text-faint)] transition-[color,transform] duration-[var(--ag-duration-fast)] motion-reduce:transition-none group-hover/row:translate-x-0.5 group-hover/row:text-[var(--ag-text-muted)]"
						/>
					{/if}
				</button>
			{/each}
			{#if displayItems.length === 0}
				<div class="col-span-full py-4 text-center text-xs text-[var(--ag-text-muted)]">
					{searchQuery ? t('workspace.item_list.no_match') : (emptyMessage || t('workspace.item_list.no_items'))}
				</div>
			{/if}
		</div>
	</div>
</div>
