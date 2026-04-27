<!-- NO_OVERFLOW_AUDIT_OK: flex-1 children are size buttons (S/M/L 1-char) and range inputs, no text overflow risk -->
<script lang="ts">
import { configStore } from '$lib/state/config.svelte';

let bg = $derived(configStore.libraryCard.background);
let style = $derived(configStore.libraryCard.style);

const SIZES = ['S', 'M', 'L'] as const;
const MODES = [
	{ id: 'image', label: '画像', desc: 'アイコン画像をカード全面に表示' },
	{ id: 'fill', label: '塗りつぶし', desc: '背景色 + アイコン色で構成' },
	{ id: 'none', label: 'なし', desc: 'タイプ別グラデーション + 中央アイコン' },
] as const;
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
		<h4 class="text-sm font-medium text-[var(--ag-text-primary)]">カードサイズ</h4>
		<p class="text-xs text-[var(--ag-text-muted)]">4:3 アスペクト固定。ウィンドウ幅で列数のみ変動します。</p>
		<div class="flex gap-2" role="group" aria-label="カードサイズ">
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
		<h4 class="text-sm font-medium text-[var(--ag-text-primary)]">背景モード</h4>
		<div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label="カード背景モード">
			{#each MODES as mode (mode.id)}
				<button
					type="button"
					role="radio"
					aria-checked={bg.mode === mode.id}
					data-testid="library-bg-mode-{mode.id}"
					class="flex flex-col items-start gap-1 rounded-md border px-3 py-2 text-left transition-[color,background-color,border-color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {bg.mode === mode.id ? 'border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] text-[var(--ag-accent-text)]' : 'border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]'}"
					onclick={() => configStore.setLibraryCardBackground({ mode: mode.id })}
				>
					<span class="text-sm font-medium">{mode.label}</span>
					<span class="text-[11px] opacity-70">{mode.desc}</span>
				</button>
			{/each}
		</div>
	</section>

	{#if bg.mode === 'fill'}
		<section class="space-y-2 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-3">
			<h4 class="text-sm font-medium text-[var(--ag-text-primary)]">塗りつぶし色</h4>
			{@render ColorRow(
				'背景色',
				bg.fillBgColor,
				(v) => configStore.setLibraryCardBackground({ fillBgColor: v }),
				'library-fill-bg-color',
			)}
			{@render ColorRow(
				'アイコン色',
				bg.fillIconColor,
				(v) => configStore.setLibraryCardBackground({ fillIconColor: v }),
				'library-fill-icon-color',
			)}
		</section>
	{/if}

	{#if bg.mode === 'image'}
		<section class="space-y-3 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-3">
			<h4 class="text-sm font-medium text-[var(--ag-text-primary)]">画像の表示位置 (focal point)</h4>
			<p class="text-[11px] text-[var(--ag-text-muted)]">画像が切り抜かれるとき、どの位置を中心に残すかを指定します。</p>
			{@render RangeRow(
				'X (横)',
				bg.focalX,
				0,
				100,
				1,
				(v) => configStore.setLibraryCardBackground({ focalX: v }),
				'library-focal-x',
				'%',
			)}
			{@render RangeRow(
				'Y (縦)',
				bg.focalY,
				0,
				100,
				1,
				(v) => configStore.setLibraryCardBackground({ focalY: v }),
				'library-focal-y',
				'%',
			)}
		</section>
	{/if}

	<!-- ラベル文字 -->
	<section class="space-y-3 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-3">
		<h4 class="text-sm font-medium text-[var(--ag-text-primary)]">ラベルの文字</h4>
		{@render ColorRow(
			'文字色',
			style.textColor,
			(v) => configStore.setLibraryCardStyle({ textColor: v }),
			'library-text-color',
		)}
		{@render CheckboxRow(
			'背景オーバーレイ',
			style.overlayEnabled,
			(v) => configStore.setLibraryCardStyle({ overlayEnabled: v }),
			'library-overlay-enabled',
		)}

		<div class="space-y-2 border-t border-[var(--ag-border)] pt-3">
			{@render CheckboxRow(
				'縁取り',
				style.strokeEnabled,
				(v) => configStore.setLibraryCardStyle({ strokeEnabled: v }),
				'library-stroke-enabled',
			)}
			{#if style.strokeEnabled}
				{@render ColorRow(
					'縁取り色',
					style.strokeColor,
					(v) => configStore.setLibraryCardStyle({ strokeColor: v }),
					'library-stroke-color',
				)}
				{@render RangeRow(
					'縁取り太さ',
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
