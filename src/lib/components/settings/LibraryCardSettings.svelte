<script lang="ts">
import { t } from '$lib/i18n.svelte';
import { configStore } from '$lib/state/config.svelte';

let style = $derived(configStore.libraryCard.style);

const SIZES = ['S', 'M', 'L'] as const;
</script>

{#snippet ColorRow(label: string, value: string, oninput: (v: string) => void, testid: string)}
	<label class="flex items-center justify-between gap-3 text-sm">
		<span class="text-[var(--ag-text-secondary)]">{label}</span>
		<input
			type="color"
			{value}
			oninput={(e) => oninput((e.currentTarget as HTMLInputElement).value)}
			data-testid={testid}
			class="h-8 w-16 cursor-pointer rounded border border-[var(--ag-border)] bg-transparent"
		/>
	</label>
{/snippet}

{#snippet RangeRow(
	label: string,
	value: number,
	min: number,
	max: number,
	step: number,
	oninput: (v: number) => void,
	testid: string,
	suffix: string,
)}
	<label class="flex items-center justify-between gap-3 text-sm">
		<span class="text-[var(--ag-text-secondary)]">{label}</span>
		<input
			type="range"
			{min}
			{max}
			{step}
			{value}
			oninput={(e) => oninput(Number((e.currentTarget as HTMLInputElement).value))}
			data-testid={testid}
			class="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--ag-surface-4)] accent-[var(--ag-accent-text)]"
		/>
		<span class="w-10 text-right text-xs tabular-nums text-[var(--ag-text-muted)]">{value}{suffix}</span>
	</label>
{/snippet}

{#snippet CheckboxRow(label: string, checked: boolean, onchange: (v: boolean) => void, testid: string)}
	<label class="flex items-center justify-between gap-3 text-sm">
		<span class="text-[var(--ag-text-secondary)]">{label}</span>
		<input
			type="checkbox"
			{checked}
			onchange={(e) => onchange((e.currentTarget as HTMLInputElement).checked)}
			data-testid={testid}
			class="h-4 w-4 cursor-pointer accent-[var(--ag-accent-text)]"
		/>
	</label>
{/snippet}

<div class="space-y-6">
	<!-- カードサイズ -->
	<section class="space-y-2">
		<h4 class="text-sm font-medium text-[var(--ag-text-primary)]">{t('settings.library_card.size_heading')}</h4>
		<p class="text-xs text-[var(--ag-text-muted)]">{t('settings.library_card.size_desc')}</p>
		<div class="flex gap-2" role="group" aria-label={t('settings.library_card.size_heading')}>
			{#each SIZES as size (size)}
				<button
					type="button"
					data-testid="library-size-{size}"
					class="flex-1 rounded-md border px-3 py-2 text-sm transition-[color,background-color,border-color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {configStore.itemSize === size ? 'border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] font-medium text-[var(--ag-accent-text)]' : 'border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]'}"
					onclick={() => void configStore.saveItemSize(size)}
				>
					{size}
				</button>
			{/each}
		</div>
	</section>

	<!-- グローバル背景設定は持たない。全カード共通の見た目は「共通サーフェス +
	     中央アイコン」固定。画像の全面表示 / アイコン差し替えは各アイテムの編集画面
	     (カード見た目設定) で指定する。 -->
	<section class="space-y-1">
		<h4 class="text-sm font-medium text-[var(--ag-text-primary)]">{t('settings.library_card.bg_heading')}</h4>
		<p class="text-xs text-[var(--ag-text-muted)]">{t('settings.library_card.bg_desc')}</p>
	</section>

	<!-- ラベル文字 -->
	<section class="space-y-3 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-3">
		<h4 class="text-sm font-medium text-[var(--ag-text-primary)]">{t('settings.library_card.label_text_heading')}</h4>
		{@render ColorRow(
			t('settings.library_card.text_color'),
			style.textColor,
			(v) => configStore.setLibraryCardStyle({ textColor: v }),
			'library-text-color',
		)}
		{@render CheckboxRow(
			t('settings.library_card.overlay'),
			style.overlayEnabled,
			(v) => configStore.setLibraryCardStyle({ overlayEnabled: v }),
			'library-overlay-enabled',
		)}

		<div class="space-y-2 border-t border-[var(--ag-border)] pt-3">
			{@render CheckboxRow(
				t('settings.library_card.stroke'),
				style.strokeEnabled,
				(v) => configStore.setLibraryCardStyle({ strokeEnabled: v }),
				'library-stroke-enabled',
			)}
			{#if style.strokeEnabled}
				{@render ColorRow(
					t('settings.library_card.stroke_color'),
					style.strokeColor,
					(v) => configStore.setLibraryCardStyle({ strokeColor: v }),
					'library-stroke-color',
				)}
				{@render RangeRow(
					t('settings.library_card.stroke_width'),
					style.strokeWidthPx,
					0,
					3,
					0.25,
					(v) => configStore.setLibraryCardStyle({ strokeWidthPx: v }),
					'library-stroke-width',
					'px',
				)}
			{/if}
		</div>
	</section>
</div>
