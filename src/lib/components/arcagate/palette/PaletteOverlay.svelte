<script lang="ts">
import { Command } from '@lucide/svelte';
import { cubicOut } from 'svelte/easing';
import { fade, fly } from 'svelte/transition';
import Chip from '$lib/components/arcagate/common/Chip.svelte';
import { t } from '$lib/i18n.svelte';
import { paletteStore } from '$lib/state/palette.svelte';
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

// overlay-palette cleanup (2026-05-13) #1: 初回は preview panel を出さない。
// 検索中 (query 非空) or 結果有り のいずれかの時のみ右 panel 表示。
let showPreview = $derived(searchQuery.length > 0 || paletteStore.results.length > 0);

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
	<!-- B-6 #1: il-zone scope 撤去、accent は theme 追従。 -->
	<div
		class="fixed inset-0 z-50"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onkeydown={handleKeydown}
	>
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
			<!-- Radial gradient overlay。
			     audit batch (2026-05-13) #10: 四隅塗りつぶしはみ出し対策で overflow-hidden で
			     確実に rounded mask 内にクリップ。 -->
			<div class="palette-glow pointer-events-none absolute inset-0 overflow-hidden rounded-[var(--ag-radius-palette)]"></div>

			<!-- Header bar (fixed)。
			     overlay-palette cleanup (2026-05-13) #7: 縦幅縮小、 py-3 → py-1.5 で白いエリア削減。
			     font-size は §4-2 制約 (Tailwind scale 強制、 任意値禁止) で text-xs 維持、 padding のみで height 縮小。
			     「Desktop Overlay Palette」 title は keep (識別性)、 hotkey chip 維持。 -->
			<div class="relative flex flex-shrink-0 items-center justify-between border-b border-[var(--ag-border)] px-4 py-1.5">
				<div class="flex items-center gap-1.5 text-xs text-[var(--ag-text-muted)]">
					<Command class="h-3 w-3" />
					<span>Desktop Overlay Palette</span>
				</div>
				<div class="flex items-center gap-2">
					<Chip tone="accent" size="sm">Ctrl + Shift + Space</Chip>
				</div>
			</div>

			<!-- Content area (scrollable)。
			     overlay-palette cleanup (2026-05-13) #7: p-4 md:p-8 → p-3 md:p-4 で内側余白圧縮。 -->
			<div
				class="relative min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,var(--ag-surface-0)_0%,var(--ag-surface-1)_100%)] p-3 md:p-4"
			>
				<!-- Inner gradient -->
				<div class="palette-glow pointer-events-none absolute inset-0"></div>

				<!-- Inner container。
				     overlay-palette cleanup (2026-05-13) #7: p-5 → p-4 で内側余白圧縮。 -->
				<div
					class="relative mx-auto max-w-4xl rounded-[var(--ag-radius-palette)] border border-[var(--ag-border)] bg-[var(--ag-surface-0)]/95 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl"
				>
					<!-- Search bar -->
					<PaletteSearchBar bind:query={searchQuery} onSearch={handleSearch} />

					<!-- overlay-palette cleanup (2026-05-13) #1: preview area conditional 表示。
					     初回 (= no query + no results) は 1-col、 検索中 OR results 有り時のみ 2-col。
					     overlay-palette cleanup #2 / #3 / #4: chips guide (`:dev` / `=` / `>` の 3 hint) 全削除、
					     必要 hint は footer bar に統合。 -->
					{#if showPreview}
						<div class="mt-4 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
							<div id="palette-results" class="space-y-2" data-testid="palette-results" role="listbox" aria-label="検索結果">
								{#each paletteStore.results as entry, index (index)}
									<PaletteResultRow
										{entry}
										{index}
										active={index === paletteStore.selectedIndex}
										onclick={() => {
											void paletteStore.launch(entry);
											close();
										}}
									/>
								{/each}
								{#if paletteStore.results.length === 0}
									<div class="py-4 text-center text-sm text-[var(--ag-text-muted)]">
										{searchQuery ? t('common.no_match') : t('palette.no_recent')}
									</div>
								{/if}
							</div>

							<PaletteQuickContext />
						</div>
					{:else}
						<!-- 初回 (query 空 + results 空): list area のみ縦並び、 preview panel 非表示。 -->
						<div id="palette-results" class="mt-4 space-y-2" data-testid="palette-results" role="listbox" aria-label="検索結果">
							{#each paletteStore.results as entry, index (index)}
								<PaletteResultRow
									{entry}
									{index}
									active={index === paletteStore.selectedIndex}
									onclick={() => {
										void paletteStore.launch(entry);
										close();
									}}
								/>
							{/each}
							{#if paletteStore.results.length === 0}
								<div class="py-4 text-center text-sm text-[var(--ag-text-muted)]">{t('palette.no_recent')}</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<!-- Footer bar (fixed)。
			     overlay-palette cleanup (2026-05-13) #6: 縦幅 py-3 → py-2、 horizontal padding px-5 → px-4 で
			     下部 area の幅広 layout を整理。 hint は機能あるもののみ (#3 = 電卓 + #5 Ctrl+H + ↑↓ + Tab) に集約。 -->
			<div class="relative flex-shrink-0 border-t border-[var(--ag-border)] px-4 py-2">
				<PaletteKeyGuide />
			</div>
		</div>
	</div>
{/if}

<style>
.palette-glow {
	background-image:
		radial-gradient(circle at top, color-mix(in srgb, var(--ag-accent) 12%, transparent), transparent 26%),
		radial-gradient(circle at bottom right, color-mix(in srgb, var(--ag-accent-tertiary) 10%, transparent), transparent 28%);
}
</style>
