<script lang="ts">
import { Search } from '@lucide/svelte';
import Chip from '$lib/components/arcagate/common/Chip.svelte';
import StatCard from '$lib/components/arcagate/common/StatCard.svelte';
import { mockItems } from '$lib/mock/arcagate/items';
import { statCards } from '$lib/mock/arcagate/stats';
import LibraryCard from './LibraryCard.svelte';

interface Props {
	onSelectItem?: (id: string) => void;
}

let { onSelectItem }: Props = $props();

// TODO: 検索・ソートを Service 経由で接続
const sortChips: { label: string; active: boolean }[] = [
	{ label: '最近使った順', active: false },
	{ label: '起動回数順', active: false },
	{ label: 'カテゴリ', active: false },
	{ label: 'タグ', active: true },
];
</script>

<main class="p-5">
	<!-- Search bar + sort chips -->
	<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
		<div
			class="flex min-w-[340px] flex-1 items-center gap-3 rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-4 py-3"
		>
			<Search class="h-5 w-5 text-[var(--ag-text-muted)]" />
			<span class="text-sm text-[var(--ag-text-muted)]">ライブラリを検索</span>
		</div>
		<div class="flex flex-wrap gap-2">
			{#each sortChips as chip}
				<Chip tone={chip.active ? "accent" : "default"}>
					{chip.label}
				</Chip>
			{/each}
		</div>
	</div>

	<!-- Stat cards -->
	<div class="mb-4 grid grid-cols-4 gap-3">
		{#each statCards as card}
			<StatCard label={card.label} value={card.value} />
		{/each}
	</div>

	<!-- Card grid -->
	<div class="grid grid-cols-3 gap-4">
		{#each mockItems as item}
			<LibraryCard {item} onclick={() => onSelectItem?.(item.id)} />
		{/each}
	</div>
</main>
