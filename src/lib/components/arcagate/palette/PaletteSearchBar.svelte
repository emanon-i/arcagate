<script lang="ts">
import { Search, X as XIcon } from '@lucide/svelte';
import Chip from '$lib/components/arcagate/common/Chip.svelte';

interface Props {
	query?: string;
	onSearch?: (query: string) => void;
}

let { query = $bindable(''), onSearch }: Props = $props();

let inputEl = $state<HTMLInputElement | null>(null);

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
			aria-label="コマンドを検索"
			aria-autocomplete="list"
			aria-controls="palette-results"
			bind:value={query}
			bind:this={inputEl}
			oninput={handleInput}
		/>
		{#if query}
			<button
				type="button"
				class="rounded-full p-0.5 text-[var(--ag-text-muted)] transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)] hover:text-[var(--ag-text-primary)]"
				aria-label="検索をクリア"
				onclick={() => { query = ''; onSearch?.(''); inputEl?.focus(); }}
			>
				<XIcon class="h-4 w-4" />
			</button>
		{/if}
	</div>

	<Chip tone="accent">Arcagate 全体を検索</Chip>
</div>
