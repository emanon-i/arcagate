<script lang="ts">
import { Search } from '@lucide/svelte';
import Chip from '$lib/components/arcagate/common/Chip.svelte';

interface Props {
	/** TODO: bind to real search query state */
	query?: string;
}

let { query = 'cla' }: Props = $props();
</script>

<!-- TODO: wire up oninput to real search handler -->
<div class="flex flex-wrap items-center gap-3 border-b border-[var(--ag-border)] pb-4">
	<div
		class="flex min-w-[280px] flex-1 items-center gap-3 rounded-2xl border border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)]/60 px-4 py-3"
	>
		<Search class="h-5 w-5 text-[var(--ag-accent-text)]" />
		<!-- TODO: replace with <input> bound to query once search logic is implemented -->
		<div class="text-base text-[var(--ag-text-primary)]">{query}</div>
	</div>

	<Chip tone="accent">Arcagate 全体を検索</Chip>
	<Chip>wk:game-dev</Chip>
	<Chip tone="warm">hidden off</Chip>
</div>
