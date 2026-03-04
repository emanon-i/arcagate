<script lang="ts">
import type { PaletteResult } from '$lib/mock/arcagate/items';

interface Props {
	result: PaletteResult;
	active?: boolean;
}

let { result, active = false }: Props = $props();
</script>

<!-- TODO: wire onclick to launch/select logic -->
<div
	class="flex items-center justify-between gap-3 rounded-[22px] border px-4 py-3 transition {active
		? 'border-cyan-400/25 bg-cyan-400/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
		: 'border-[var(--ag-border)] bg-white/[0.03]'}"
	role="option"
	aria-selected={active}
>
	<div class="flex min-w-0 items-center gap-3">
		<div
			class="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br {result.accent} ring-1 ring-white/10"
		>
			<result.icon class="h-5 w-5 text-white" />
		</div>
		<div class="min-w-0">
			<div class="truncate text-sm font-semibold text-[var(--ag-text-primary)]">{result.title}</div>
			<div class="truncate text-xs text-[var(--ag-text-muted)]">{result.subtitle}</div>
		</div>
	</div>

	<div class="text-right">
		<div class="text-xs text-[var(--ag-text-muted)]">{result.meta}</div>
		{#if active}
			<div class="mt-1 text-[11px] text-[var(--ag-accent-text)]">Enter で起動</div>
		{/if}
	</div>
</div>
