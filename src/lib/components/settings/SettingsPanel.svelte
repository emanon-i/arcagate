<script lang="ts">
import { configStore } from '$lib/state/config.svelte';
import { soundStore } from '$lib/state/sound.svelte';
import { themeStore } from '$lib/state/theme.svelte';
import AutostartToggle from './AutostartToggle.svelte';
import ExportImport from './ExportImport.svelte';
import HotkeyInput from './HotkeyInput.svelte';

$effect(() => {
	configStore.loadConfig();
});
</script>

<div class="flex h-full flex-col overflow-y-auto">
	<div class="border-b border-[var(--ag-border)] px-5 py-4">
		<h2 class="text-base font-semibold text-[var(--ag-text-primary)]">設定</h2>
	</div>

	{#if configStore.loading}
		<div class="p-5">
			<p class="text-sm text-[var(--ag-text-muted)]">読み込み中...</p>
		</div>
	{:else}
		<div class="divide-y divide-[var(--ag-border)]">
			<!-- 一般 -->
			<section class="px-5 py-4">
				<h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">一般</h3>
				<div class="space-y-4">
					<div class="flex items-start justify-between gap-4">
						<div class="min-w-0">
							<p class="text-sm font-medium text-[var(--ag-text-primary)]">グローバルホットキー</p>
							<p class="mt-0.5 text-xs text-[var(--ag-text-muted)]">コマンドパレットを開くショートカット</p>
						</div>
						<div class="shrink-0">
							<HotkeyInput
								value={configStore.hotkey}
								onChange={(newHotkey) => configStore.saveHotkey(newHotkey)}
							/>
						</div>
					</div>
					<div class="flex items-center justify-between gap-4">
						<div class="min-w-0">
							<p class="text-sm font-medium text-[var(--ag-text-primary)]">自動起動</p>
							<p class="mt-0.5 text-xs text-[var(--ag-text-muted)]">ログイン時に自動的に起動する</p>
						</div>
						<div class="shrink-0">
							<AutostartToggle
								enabled={configStore.autostart}
								onChange={(enabled) => configStore.saveAutostart(enabled)}
							/>
						</div>
					</div>
				</div>
			</section>

			<!-- ワークスペース -->
			<section class="px-5 py-4">
				<h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">ワークスペース</h3>
				<div class="space-y-4">
					<div>
						<div class="mb-2 flex items-center justify-between">
							<p class="text-sm font-medium text-[var(--ag-text-primary)]">ウィジェット拡大率</p>
							<span class="text-sm tabular-nums text-[var(--ag-text-secondary)]">{configStore.widgetZoom}%</span>
						</div>
						<input
							type="range"
							min="50"
							max="200"
							step="10"
							value={configStore.widgetZoom}
							oninput={(e) => configStore.setWidgetZoom(Number(e.currentTarget.value))}
							class="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--ag-surface-4)] accent-[var(--ag-accent-text)]"
						/>
						<p class="mt-1.5 text-xs text-[var(--ag-text-muted)]">Ctrl+ホイールでも変更できます</p>
					</div>
				</div>
			</section>

			<!-- テーマ -->
			<section class="px-5 py-4">
				<h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">テーマ</h3>
				<div class="flex gap-2">
					<button
						type="button"
						class="rounded-lg border px-4 py-2 text-sm transition-colors {themeStore.activeMode === 'dark'
							? 'border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] text-[var(--ag-accent-text)]'
							: 'border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]'}"
						onclick={() => void themeStore.setThemeMode('dark')}
					>
						ダーク
					</button>
					<button
						type="button"
						class="rounded-lg border px-4 py-2 text-sm transition-colors {themeStore.activeMode === 'light'
							? 'border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] text-[var(--ag-accent-text)]'
							: 'border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]'}"
						onclick={() => void themeStore.setThemeMode('light')}
					>
						ライト
					</button>
				</div>
			</section>

			<!-- サウンド -->
			<section class="px-5 py-4">
				<h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">サウンド</h3>
				<div class="space-y-4">
					<div class="flex items-center justify-between gap-4">
						<div class="min-w-0">
							<p class="text-sm font-medium text-[var(--ag-text-primary)]">クリック効果音</p>
							<p class="mt-0.5 text-xs text-[var(--ag-text-muted)]">ボタン・パレット実行時にクリック音を鳴らす</p>
						</div>
						<div class="shrink-0">
							<button
								type="button"
								role="switch"
								aria-checked={soundStore.soundEnabled}
								aria-label="クリック効果音を{soundStore.soundEnabled ? '無効' : '有効'}にする"
								class="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none {soundStore.soundEnabled
									? 'bg-[var(--ag-accent)]'
									: 'bg-[var(--ag-surface-4)]'}"
								onclick={() => soundStore.setSoundEnabled(!soundStore.soundEnabled)}
							>
								<span
									class="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-[var(--ag-duration-fast)] motion-reduce:transition-none {soundStore.soundEnabled
										? 'translate-x-6'
										: 'translate-x-1'}"
								></span>
							</button>
						</div>
					</div>
					{#if soundStore.soundEnabled}
						<div>
							<div class="mb-2 flex items-center justify-between">
								<p class="text-sm font-medium text-[var(--ag-text-primary)]">音量</p>
								<span class="text-sm tabular-nums text-[var(--ag-text-secondary)]">{Math.round(soundStore.soundVolume * 100)}%</span>
							</div>
							<input
								type="range"
								min="0"
								max="1"
								step="0.05"
								value={soundStore.soundVolume}
								oninput={(e) => soundStore.setSoundVolume(Number(e.currentTarget.value))}
								class="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--ag-surface-4)] accent-[var(--ag-accent-text)]"
							/>
						</div>
					{/if}
				</div>
			</section>

			<!-- データ -->
			<section class="px-5 py-4">
				<h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">データ</h3>
				<ExportImport />
			</section>
		</div>
	{/if}

	{#if configStore.error}
		<div class="mx-5 mb-4 rounded-md border border-[var(--ag-error-border)] bg-[var(--ag-error-bg)] px-3 py-2">
			<p class="text-sm text-[var(--ag-error-text)]">{configStore.error}</p>
		</div>
	{/if}
</div>
