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
			<label class="flex items-center justify-between gap-3 text-sm">
				<span class="text-[var(--ag-text-secondary)]">背景色</span>
				<input
					type="color"
					value={bg.fillBgColor}
					oninput={(e) => configStore.setLibraryCardBackground({ fillBgColor: e.currentTarget.value })}
					data-testid="library-fill-bg-color"
					class="h-8 w-16 cursor-pointer rounded border border-[var(--ag-border)] bg-transparent"
				/>
			</label>
			<label class="flex items-center justify-between gap-3 text-sm">
				<span class="text-[var(--ag-text-secondary)]">アイコン色</span>
				<input
					type="color"
					value={bg.fillIconColor}
					oninput={(e) => configStore.setLibraryCardBackground({ fillIconColor: e.currentTarget.value })}
					data-testid="library-fill-icon-color"
					class="h-8 w-16 cursor-pointer rounded border border-[var(--ag-border)] bg-transparent"
				/>
			</label>
		</section>
	{/if}

	{#if bg.mode === 'image'}
		<section class="space-y-3 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-3">
			<h4 class="text-sm font-medium text-[var(--ag-text-primary)]">画像の表示位置 (focal point)</h4>
			<p class="text-[11px] text-[var(--ag-text-muted)]">画像が切り抜かれるとき、どの位置を中心に残すかを指定します。</p>
			<label class="flex items-center justify-between gap-3 text-sm">
				<span class="text-[var(--ag-text-secondary)]">X (横)</span>
				<input
					type="range"
					min="0"
					max="100"
					step="1"
					value={bg.focalX}
					oninput={(e) => configStore.setLibraryCardBackground({ focalX: Number(e.currentTarget.value) })}
					data-testid="library-focal-x"
					class="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--ag-surface-4)] accent-[var(--ag-accent-text)]"
				/>
				<span class="w-10 text-right text-xs tabular-nums text-[var(--ag-text-muted)]">{bg.focalX}%</span>
			</label>
			<label class="flex items-center justify-between gap-3 text-sm">
				<span class="text-[var(--ag-text-secondary)]">Y (縦)</span>
				<input
					type="range"
					min="0"
					max="100"
					step="1"
					value={bg.focalY}
					oninput={(e) => configStore.setLibraryCardBackground({ focalY: Number(e.currentTarget.value) })}
					data-testid="library-focal-y"
					class="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--ag-surface-4)] accent-[var(--ag-accent-text)]"
				/>
				<span class="w-10 text-right text-xs tabular-nums text-[var(--ag-text-muted)]">{bg.focalY}%</span>
			</label>
		</section>
	{/if}

	<!-- ラベル文字 -->
	<section class="space-y-3 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-3">
		<h4 class="text-sm font-medium text-[var(--ag-text-primary)]">ラベルの文字</h4>
		<label class="flex items-center justify-between gap-3 text-sm">
			<span class="text-[var(--ag-text-secondary)]">文字色</span>
			<input
				type="color"
				value={style.textColor}
				oninput={(e) => configStore.setLibraryCardStyle({ textColor: e.currentTarget.value })}
				data-testid="library-text-color"
				class="h-8 w-16 cursor-pointer rounded border border-[var(--ag-border)] bg-transparent"
			/>
		</label>
		<label class="flex items-center justify-between gap-3 text-sm">
			<span class="text-[var(--ag-text-secondary)]">背景オーバーレイ</span>
			<input
				type="checkbox"
				checked={style.overlayEnabled}
				onchange={(e) => configStore.setLibraryCardStyle({ overlayEnabled: e.currentTarget.checked })}
				data-testid="library-overlay-enabled"
				class="h-4 w-4 cursor-pointer accent-[var(--ag-accent-text)]"
			/>
		</label>

		<div class="space-y-2 border-t border-[var(--ag-border)] pt-3">
			<label class="flex items-center justify-between gap-3 text-sm">
				<span class="text-[var(--ag-text-secondary)]">縁取り</span>
				<input
					type="checkbox"
					checked={style.strokeEnabled}
					onchange={(e) => configStore.setLibraryCardStyle({ strokeEnabled: e.currentTarget.checked })}
					data-testid="library-stroke-enabled"
					class="h-4 w-4 cursor-pointer accent-[var(--ag-accent-text)]"
				/>
			</label>
			{#if style.strokeEnabled}
				<label class="flex items-center justify-between gap-3 text-sm">
					<span class="text-[var(--ag-text-secondary)]">縁取り色</span>
					<input
						type="color"
						value={style.strokeColor}
						oninput={(e) => configStore.setLibraryCardStyle({ strokeColor: e.currentTarget.value })}
						data-testid="library-stroke-color"
						class="h-8 w-16 cursor-pointer rounded border border-[var(--ag-border)] bg-transparent"
					/>
				</label>
				<label class="flex items-center justify-between gap-3 text-sm">
					<span class="text-[var(--ag-text-secondary)]">縁取り太さ</span>
					<input
						type="range"
						min="0"
						max="3"
						step="0.25"
						value={style.strokeWidthPx}
						oninput={(e) => configStore.setLibraryCardStyle({ strokeWidthPx: Number(e.currentTarget.value) })}
						data-testid="library-stroke-width"
						class="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--ag-surface-4)] accent-[var(--ag-accent-text)]"
					/>
					<span class="w-10 text-right text-xs tabular-nums text-[var(--ag-text-muted)]">{style.strokeWidthPx}px</span>
				</label>
			{/if}
		</div>
	</section>
</div>
