<script lang="ts">
import { Command } from '@lucide/svelte';
import Chip from '$lib/components/arcagate/common/Chip.svelte';
import { paletteResults } from '$lib/mock/arcagate/items';
import PaletteKeyGuide from './PaletteKeyGuide.svelte';
import PaletteQuickContext from './PaletteQuickContext.svelte';
import PaletteResultRow from './PaletteResultRow.svelte';
import PaletteSearchBar from './PaletteSearchBar.svelte';

interface Props {
	open: boolean;
}

let { open = $bindable() }: Props = $props();

function close() {
	open = false;
}

function handleKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape') {
		close();
	}
}

// TODO: implement arrow-key navigation for active result index
// TODO: wire Enter key to launch selected item
</script>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div class="fixed inset-0 z-50" role="dialog" tabindex="-1" onkeydown={handleKeydown}>
		<!-- Backdrop -->
		<button
			type="button"
			class="absolute inset-0 bg-black/50 backdrop-blur-sm"
			aria-label="パレットを閉じる"
			onclick={close}
			tabindex="-1"
		></button>

		<!-- Palette card -->
		<div
			class="relative mx-auto mt-[10vh] max-w-5xl rounded-[var(--ag-radius-palette)] border border-[var(--ag-border)] bg-[var(--ag-surface-0)]/92 shadow-[0_40px_120px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
		>
			<!-- Radial gradient overlay -->
			<div
				class="pointer-events-none absolute inset-0 rounded-[var(--ag-radius-palette)] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.10),_transparent_28%)]"
			></div>

			<!-- Header bar -->
			<div class="relative flex items-center justify-between border-b border-[var(--ag-border)] px-5 py-3">
				<div class="flex items-center gap-2 text-xs text-[var(--ag-text-muted)]">
					<Command class="h-4 w-4" />
					<span>Desktop Overlay Palette</span>
				</div>
				<div class="flex items-center gap-2">
					<Chip tone="accent">Alt + Space</Chip>
					<Chip tone="warm">hidden off</Chip>
				</div>
			</div>

			<!-- Content area -->
			<div
				class="relative overflow-hidden bg-[linear-gradient(180deg,var(--ag-surface-0)_0%,var(--ag-surface-1)_100%)] p-8"
			>
				<!-- Inner gradient -->
				<div
					class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.10),_transparent_28%)]"
				></div>

				<!-- Nested container -->
				<div
					class="relative mx-auto max-w-4xl rounded-[var(--ag-radius-palette)] border border-[var(--ag-border)] bg-[var(--ag-surface-0)]/95 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl"
				>
					<!-- Search bar -->
					<PaletteSearchBar />

					<!-- 2-column grid: results + context -->
					<div class="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
						<!-- Left: results + guide chips -->
						<div class="space-y-2">
							{#each paletteResults as result, index}
								<PaletteResultRow {result} active={index === 0} />
							{/each}

							<PaletteKeyGuide variant="chips" />
						</div>

						<!-- Right: quick context -->
						<PaletteQuickContext />
					</div>

					<!-- Bottom keyboard hints -->
					<PaletteKeyGuide variant="bar" />
				</div>
			</div>
		</div>
	</div>
{/if}
