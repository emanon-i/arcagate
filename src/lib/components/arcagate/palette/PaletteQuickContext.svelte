<script lang="ts">
import DetailRow from '$lib/components/arcagate/common/DetailRow.svelte';
import Tip from '$lib/components/arcagate/common/Tip.svelte';
import { t } from '$lib/i18n.svelte';
import { getItemTags } from '$lib/ipc/items';
import { getItemStats } from '$lib/ipc/launch';
import { paletteStore } from '$lib/state/palette.svelte';
import type { ItemStats } from '$lib/types/item';
import type { Tag } from '$lib/types/tag';

let itemTags = $state<Tag[]>([]);
let stats = $state<ItemStats | null>(null);
let fetchSeq = 0;

let selected = $derived(paletteStore.results[paletteStore.selectedIndex] ?? null);

$effect(() => {
	const entry = selected;
	if (entry?.kind === 'item') {
		const itemId = entry.item.id;
		const seq = ++fetchSeq;
		itemTags = [];
		stats = null;
		void Promise.all([
			getItemTags(itemId).then((t) => {
				if (seq === fetchSeq) itemTags = t;
			}),
			getItemStats(itemId).then((s) => {
				if (seq === fetchSeq) stats = s;
			}),
		]);
	} else {
		++fetchSeq;
		itemTags = [];
		stats = null;
	}
});

// TODO Phase 4 (Intl formatter): Intl.RelativeTimeFormat 経由で locale 別 format。
// 本 PR では format function 内 string は keep (Phase 4 移行 reserve)、
// label / heading / tip 等の他文字列のみ t() 化。
function formatRelativeTime(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const minutes = Math.floor(diff / 60000);
	if (minutes < 1) return 'たった今';
	if (minutes < 60) return `${minutes}分前`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}時間前`;
	const days = Math.floor(hours / 24);
	return `${days}日前`;
}
</script>

<div class="space-y-4 rounded-[24px] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-4" role="region" aria-label="選択アイテムの詳細">
	{#if selected?.kind === 'item'}
		<div>
			<div class="text-xs uppercase tracking-[0.16em] text-[var(--ag-text-muted)]">{t('palette.context.preview')}</div>
			<div class="mt-2 text-sm font-medium text-[var(--ag-text-primary)]">{selected.item.label}</div>
		</div>

		<div class="space-y-2 text-sm">
			{#if itemTags.length > 0}
				<DetailRow label={t('palette.context.tags')} value={itemTags.map((tag) => tag.name).join(', ')} />
			{/if}
			{#if selected.item.aliases.length > 0}
				<DetailRow label={t('palette.context.aliases')} value={selected.item.aliases.join(' / ')} />
			{/if}
			{#if stats?.last_launched_at}
				<DetailRow label={t('palette.context.last_launched')} value={formatRelativeTime(stats.last_launched_at)} />
			{/if}
			{#if stats}
				<DetailRow label={t('palette.context.launch_count')} value={String(stats.launch_count)} />
			{/if}
		</div>
	{:else if selected?.kind === 'calc'}
		<div>
			<div class="text-xs uppercase tracking-[0.16em] text-[var(--ag-text-muted)]">{t('palette.context.calculator')}</div>
			<div class="mt-2 text-sm font-medium text-[var(--ag-text-primary)]">{selected.expression}</div>
			<div class="mt-1 text-lg font-bold text-[var(--ag-accent-text)]">= {selected.result}</div>
		</div>
	{:else if selected?.kind === 'clipboard'}
		<div>
			<div class="text-xs uppercase tracking-[0.16em] text-[var(--ag-text-muted)]">{t('palette.context.clipboard')}</div>
			<div class="mt-2 line-clamp-6 text-sm text-[var(--ag-text-secondary)]">{selected.text}</div>
		</div>
	{:else}
		<div>
			<div class="text-xs uppercase tracking-[0.16em] text-[var(--ag-text-muted)]">{t('palette.context.preview')}</div>
			<div class="mt-2 text-sm text-[var(--ag-text-muted)]">
				{t('palette.context.empty_hint')}
			</div>
		</div>
	{/if}

	<Tip tone="success" tipId="palette-shortcut-hint">
		{t('palette.context.tip')}
	</Tip>
</div>
