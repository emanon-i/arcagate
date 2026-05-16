<script lang="ts">
import DetailRow from '$lib/components/arcagate/common/DetailRow.svelte';
import Tip from '$lib/components/arcagate/common/Tip.svelte';
import { t } from '$lib/i18n.svelte';
import { getItemTags } from '$lib/ipc/items';
import { getItemStats } from '$lib/ipc/launch';
import { paletteStore } from '$lib/state/palette.svelte';
import type { ItemStats } from '$lib/types/item';
import type { Tag } from '$lib/types/tag';
import { formatNumber, formatRelative } from '$lib/utils/intl-formatter.svelte';

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

// Phase 4 完遂: 旧 ad-hoc formatRelativeTime (ja hardcode) を `formatRelative` (Intl.RelativeTimeFormat 経由) に置換。
// locale 別 format に追従、 「2 人が同じ format」 mechanical 基準を満たす。
</script>

<div class="space-y-4 rounded-[24px] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-4" role="region" aria-label={t('palette.context.detail_aria')}>
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
				<DetailRow label={t('palette.context.last_launched')} value={formatRelative(stats.last_launched_at)} />
			{/if}
			{#if stats}
				<DetailRow label={t('palette.context.launch_count')} value={formatNumber(stats.launch_count)} />
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
