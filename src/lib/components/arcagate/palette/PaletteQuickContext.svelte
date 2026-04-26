<script lang="ts">
import DetailRow from '$lib/components/arcagate/common/DetailRow.svelte';
import Tip from '$lib/components/arcagate/common/Tip.svelte';
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
			<div class="text-xs uppercase tracking-[0.16em] text-[var(--ag-text-muted)]">プレビュー</div>
			<div class="mt-2 text-sm font-medium text-[var(--ag-text-primary)]">{selected.item.label}</div>
		</div>

		<div class="space-y-2 text-sm">
			{#if itemTags.length > 0}
				<DetailRow label="タグ" value={itemTags.map((t) => t.name).join(', ')} />
			{/if}
			{#if selected.item.aliases.length > 0}
				<DetailRow label="別名" value={selected.item.aliases.join(' / ')} />
			{/if}
			{#if stats?.last_launched_at}
				<DetailRow label="最終起動" value={formatRelativeTime(stats.last_launched_at)} />
			{/if}
			{#if stats}
				<DetailRow label="起動回数" value={String(stats.launch_count)} />
			{/if}
		</div>
	{:else if selected?.kind === 'calc'}
		<div>
			<div class="text-xs uppercase tracking-[0.16em] text-[var(--ag-text-muted)]">電卓</div>
			<div class="mt-2 text-sm font-medium text-[var(--ag-text-primary)]">{selected.expression}</div>
			<div class="mt-1 text-lg font-bold text-[var(--ag-accent-text)]">= {selected.result}</div>
		</div>
	{:else if selected?.kind === 'clipboard'}
		<div>
			<div class="text-xs uppercase tracking-[0.16em] text-[var(--ag-text-muted)]">クリップボード</div>
			<div class="mt-2 line-clamp-6 text-sm text-[var(--ag-text-secondary)]">{selected.text}</div>
		</div>
	{:else}
		<div>
			<div class="text-xs uppercase tracking-[0.16em] text-[var(--ag-text-muted)]">プレビュー</div>
			<div class="mt-2 text-sm text-[var(--ag-text-muted)]">
				検索するか矢印キーで選択してください
			</div>
		</div>
	{/if}

	<Tip tone="success" tipId="palette-shortcut-hint">
		ショートカットや別名を登録すると、数文字で目的のアプリに到達できます。
	</Tip>
</div>
