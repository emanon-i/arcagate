<script lang="ts">
import { Command } from '@lucide/svelte';
import { cubicOut } from 'svelte/easing';
import { fade, fly } from 'svelte/transition';
import Chip from '$lib/components/arcagate/common/Chip.svelte';
import { hiddenStore } from '$lib/state/hidden.svelte';
import { paletteStore } from '$lib/state/palette.svelte';
import { soundStore } from '$lib/state/sound.svelte';
import { playClick } from '$lib/utils/sfx';
import PaletteKeyGuide from './PaletteKeyGuide.svelte';
import PaletteQuickContext from './PaletteQuickContext.svelte';
import PaletteResultRow from './PaletteResultRow.svelte';
import PaletteSearchBar from './PaletteSearchBar.svelte';

interface Props {
	open: boolean;
	mode?: 'inline' | 'floating';
	onClose?: () => void;
}

let { open = $bindable(), mode = 'inline', onClose }: Props = $props();

const rm =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;

let searchQuery = $state('');

// Sync open state with paletteStore
$effect(() => {
	if (open && !paletteStore.isOpen) {
		paletteStore.open();
		void paletteStore.search('');
	} else if (!open && paletteStore.isOpen) {
		paletteStore.close();
	}
});

function close() {
	searchQuery = '';
	paletteStore.close();
	if (mode === 'floating') {
		onClose?.();
	} else {
		open = false;
	}
}

let searchTimer: ReturnType<typeof setTimeout> | null = null;

function handleSearch(q: string) {
	if (searchTimer !== null) clearTimeout(searchTimer);
	searchTimer = setTimeout(() => {
		void paletteStore.search(q);
	}, 150);
}

function handleKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape') {
		close();
	} else if (e.key === 'ArrowDown') {
		e.preventDefault();
		paletteStore.selectNext();
	} else if (e.key === 'ArrowUp') {
		e.preventDefault();
		paletteStore.selectPrev();
	} else if (e.key === 'Enter') {
		e.preventDefault();
		const selected = paletteStore.results[paletteStore.selectedIndex];
		if (selected) {
			if (soundStore.soundEnabled) void playClick(soundStore.soundVolume);
			void paletteStore.launch(selected);
			close();
		}
	} else if (e.key === 'Tab') {
		e.preventDefault();
		const completed = paletteStore.tabComplete();
		if (completed !== null) {
			searchQuery = completed;
			void paletteStore.search(completed);
		}
	}
}
</script>

{#if open}
	<div class="fixed inset-0 z-50" role="dialog" aria-modal="true" tabindex="-1" onkeydown={handleKeydown}>
		{#if mode === 'inline'}
			<!-- Backdrop (inline only) -->
			<button
				type="button"
				class="absolute inset-0 bg-black/50 backdrop-blur-sm"
				aria-label="パレットを閉じる"
				onclick={close}
				tabindex="-1"
				transition:fade={{ duration: dFast }}
			></button>
		{/if}

		<!-- Palette card (3-section flex column: header / scrollable body / footer) -->
		<div
			class="relative mx-auto mt-[5vh] flex max-h-[90vh] max-w-5xl flex-col overflow-hidden rounded-[var(--ag-radius-palette)] border border-[var(--ag-border)] bg-[var(--ag-surface-0)]/92 shadow-[0_40px_120px_rgba(0,0,0,0.6)] backdrop-blur-2xl md:mt-[10vh]"
			in:fly={{ y: -12, duration: dNormal, easing: cubicOut }}
			out:fade={{ duration: dFast }}
		>
			<!-- Radial gradient overlay -->
			<div
				class="pointer-events-none absolute inset-0 rounded-[var(--ag-radius-palette)] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.10),_transparent_28%)]"
			></div>

			<!-- Header bar (fixed) -->
			<div class="relative flex flex-shrink-0 items-center justify-between border-b border-[var(--ag-border)] px-5 py-3">
				<div class="flex items-center gap-2 text-xs text-[var(--ag-text-muted)]">
					<Command class="h-4 w-4" />
					<span>Desktop Overlay Palette</span>
				</div>
				<div class="flex items-center gap-2">
					<Chip tone="accent">Alt + Space</Chip>
					<Chip tone="warm">{hiddenStore.isHiddenVisible ? '非表示: ON' : '非表示: OFF'}</Chip>
				</div>
			</div>

			<!-- Content area (scrollable) -->
			<div
				class="relative min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,var(--ag-surface-0)_0%,var(--ag-surface-1)_100%)] p-4 md:p-8"
			>
				<!-- Inner gradient -->
				<div
					class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.10),_transparent_28%)]"
				></div>

				<!-- Inner container -->
				<div
					class="relative mx-auto max-w-4xl rounded-[var(--ag-radius-palette)] border border-[var(--ag-border)] bg-[var(--ag-surface-0)]/95 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl"
				>
					<!-- Search bar -->
					<PaletteSearchBar bind:query={searchQuery} onSearch={handleSearch} />

					<!-- 2-column grid: results + context -->
					<div class="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
						<!-- Left: results + guide chips -->
						<div id="palette-results" class="space-y-2" data-testid="palette-results" role="listbox" aria-label="検索結果">
							{#each paletteStore.results as entry, index (index)}
								<PaletteResultRow
									{entry}
									{index}
									active={index === paletteStore.selectedIndex}
									onclick={() => {
										if (soundStore.soundEnabled) void playClick(soundStore.soundVolume);
										void paletteStore.launch(entry);
										close();
									}}
								/>
							{/each}
							{#if paletteStore.results.length === 0}
								<div class="py-4 text-center text-sm text-[var(--ag-text-muted)]">
									{searchQuery ? '一致する結果がありません' : '最近の起動履歴がありません'}
								</div>
							{/if}

							<PaletteKeyGuide variant="chips" />
						</div>

						<!-- Right: quick context -->
						<PaletteQuickContext />
					</div>
				</div>
			</div>

			<!-- Footer bar (fixed) -->
			<div class="relative flex-shrink-0 border-t border-[var(--ag-border)] px-5 py-3">
				<PaletteKeyGuide variant="bar" />
			</div>
		</div>
	</div>
{/if}
