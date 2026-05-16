<script lang="ts">
import { t } from '$lib/i18n.svelte';
import { configStore } from '$lib/state/config.svelte';

let bg = $derived(configStore.libraryCard.background);
let style = $derived(configStore.libraryCard.style);

const SIZES = ['S', 'M', 'L'] as const;
const MODES = [{ id: 'image' as const }, { id: 'fill' as const }, { id: 'none' as const }];
let modes = $derived(
	MODES.map((m) => ({
		...m,
		label: t(`settings.library_card.mode_${m.id}_label`),
		desc: t(`settings.library_card.mode_${m.id}_desc`),
	})),
);
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

	<!-- 背景モード -->
	<section class="space-y-2">
		<h4 class="text-sm font-medium text-[var(--ag-text-primary)]">{t('settings.library_card.bg_mode_heading')}</h4>
		<div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('settings.library_card.bg_mode_heading')}>
			{#each modes as mode (mode.id)}
				<button
					type="button"
					role="radio"
					aria-checked={bg.mode === mode.id}
					data-testid="library-bg-mode-{mode.id}"
					class="flex flex-col items-start gap-1 rounded-md border px-3 py-2 text-left transition-[color,background-color,border-color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {bg.mode === mode.id ? 'border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] text-[var(--ag-accent-text)]' : 'border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]'}"
					onclick={() => configStore.setLibraryCardBackground({ mode: mode.id })}
				>
					<span class="text-sm font-medium">{mode.label}</span>
					<span class="text-xs opacity-70">{mode.desc}</span>
				</button>
			{/each}
		</div>
	</section>

	{#if bg.mode === 'fill'}
		<section class="space-y-2 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-3">
			<h4 class="text-sm font-medium text-[var(--ag-text-primary)]">{t('settings.library_card.fill_color_heading')}</h4>
			{@render ColorRow(
				t('settings.library_card.fill_bg_color'),
				bg.fillBgColor,
				(v) => configStore.setLibraryCardBackground({ fillBgColor: v }),
				'library-fill-bg-color',
			)}
			{@render ColorRow(
				t('settings.library_card.fill_icon_color'),
				bg.fillIconColor,
				(v) => configStore.setLibraryCardBackground({ fillIconColor: v }),
				'library-fill-icon-color',
			)}
		</section>
	{/if}

	<!-- B-9 #17: 画像の表示位置 (focal point) section は Settings から削除。
	     全カード一律設定では実用性低、適切な移動先未定のため一旦削除。
	     bg.focalX/Y の defaults は configStore で 50/50 維持。 -->

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
