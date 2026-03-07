<script lang="ts">
import { Search } from '@lucide/svelte';
import Chip from '$lib/components/arcagate/common/Chip.svelte';

interface Props {
	query?: string;
	onSearch?: (query: string) => void;
}

let { query = $bindable(''), onSearch }: Props = $props();

function handleInput(e: Event) {
	const target = e.target as HTMLInputElement;
	query = target.value;
	onSearch?.(query);
}
</script>

<div class="flex flex-wrap items-center gap-3 border-b border-[var(--ag-border)] pb-4">
	<div
		class="flex min-w-[280px] flex-1 items-center gap-3 rounded-2xl border border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)]/60 px-4 py-3"
	>
		<Search class="h-5 w-5 text-[var(--ag-accent-text)]" />
		<input
			type="text"
			class="flex-1 bg-transparent text-base text-[var(--ag-text-primary)] outline-none placeholder:text-[var(--ag-text-muted)]"
			placeholder="検索..."
			autocomplete="off"
			bind:value={query}
			oninput={handleInput}
		/>
	</div>

	<Chip tone="accent">Arcagate 全体を検索</Chip>
</div>
