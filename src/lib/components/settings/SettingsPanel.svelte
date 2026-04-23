<script lang="ts">
import { Database, LayoutDashboard, Palette, Settings2, Volume2 } from '@lucide/svelte';
import type { Component } from 'svelte';
import { configStore } from '$lib/state/config.svelte';
import { soundStore } from '$lib/state/sound.svelte';
import { themeStore } from '$lib/state/theme.svelte';
import AutostartToggle from './AutostartToggle.svelte';
import ExportImport from './ExportImport.svelte';
import HotkeyInput from './HotkeyInput.svelte';

type CategoryId = 'general' | 'workspace' | 'appearance' | 'sound' | 'data';

const categories: { id: CategoryId; label: string; icon: Component }[] = [
	{ id: 'general', label: '一般', icon: Settings2 },
	{ id: 'workspace', label: 'ワークスペース', icon: LayoutDashboard },
	{ id: 'appearance', label: '外観', icon: Palette },
	{ id: 'sound', label: 'サウンド', icon: Volume2 },
	{ id: 'data', label: 'データ', icon: Database },
];

let activeCategory = $state<CategoryId>('general');

$effect(() => {
	configStore.loadConfig();
});

function handleNavKeydown(e: KeyboardEvent) {
	const idx = categories.findIndex((c) => c.id === activeCategory);
	if (e.key === 'ArrowDown') {
		e.preventDefault();
		activeCategory = categories[Math.min(idx + 1, categories.length - 1)].id;
	} else if (e.key === 'ArrowUp') {
		e.preventDefault();
		activeCategory = categories[Math.max(idx - 1, 0)].id;
	}
}
</script>

<div class="flex h-full min-h-0">
	<!-- 左: カテゴリナビ -->
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div
		class="flex w-44 shrink-0 flex-col gap-0.5 border-r border-[var(--ag-border)] bg-[var(--ag-surface-1)] px-2 py-3"
		role="tablist"
		aria-label="設定カテゴリ"
		aria-orientation="vertical"
		onkeydown={handleNavKeydown}
	>
		{#each categories as cat (cat.id)}
			{@const Icon = cat.icon}
			{@const isActive = activeCategory === cat.id}
			<button
				type="button"
				role="tab"
				aria-selected={isActive}
				aria-controls="settings-panel-{cat.id}"
				tabindex={isActive ? 0 : -1}
				class="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-[color,background-color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {isActive
					? 'bg-[var(--ag-accent-bg)] font-medium text-[var(--ag-accent-text)]'
					: 'text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)]'}"
				onclick={() => (activeCategory = cat.id)}
			>
				<Icon class="h-4 w-4 shrink-0" />
				{cat.label}
			</button>
		{/each}
	</div>

	<!-- 右: コンテンツ -->
	<div class="min-w-0 flex-1 overflow-y-auto">
		{#if configStore.loading}
			<div class="p-5">
				<p class="text-sm text-[var(--ag-text-muted)]">読み込み中...</p>
			</div>
		{:else}
			{#if activeCategory === 'general'}
				<div
					id="settings-panel-general"
					role="tabpanel"
					aria-labelledby="tab-general"
					class="space-y-4 px-6 py-5"
				>
					<h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">
						一般
					</h3>
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
			{:else if activeCategory === 'workspace'}
				<div
					id="settings-panel-workspace"
					role="tabpanel"
					aria-labelledby="tab-workspace"
					class="space-y-4 px-6 py-5"
				>
					<h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">
						ワークスペース
					</h3>
					<div>
						<div class="mb-2 flex items-center justify-between">
							<p class="text-sm font-medium text-[var(--ag-text-primary)]">ウィジェット拡大率</p>
							<span class="text-sm tabular-nums text-[var(--ag-text-secondary)]"
								>{configStore.widgetZoom}%</span
							>
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
			{:else if activeCategory === 'appearance'}
				<div
					id="settings-panel-appearance"
					role="tabpanel"
					aria-labelledby="tab-appearance"
					class="space-y-4 px-6 py-5"
				>
					<h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">
						外観
					</h3>
					<div>
						<p class="mb-3 text-sm font-medium text-[var(--ag-text-primary)]">テーマ</p>
						<div class="grid grid-cols-2 gap-2">
							<!-- フラット Dark / Light -->
							<button
								type="button"
								class="flex flex-col gap-1 rounded-lg border px-4 py-3 text-left text-sm transition-[color,background-color,border-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {themeStore.activeMode === 'dark' ? 'border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] text-[var(--ag-accent-text)]' : 'border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]'}"
								onclick={() => void themeStore.setThemeMode('dark')}
							>
								<span class="font-medium">フラット ダーク</span>
								<span class="text-xs opacity-70">デフォルト</span>
							</button>
							<button
								type="button"
								class="flex flex-col gap-1 rounded-lg border px-4 py-3 text-left text-sm transition-[color,background-color,border-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {themeStore.activeMode === 'light' ? 'border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] text-[var(--ag-accent-text)]' : 'border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]'}"
								onclick={() => void themeStore.setThemeMode('light')}
							>
								<span class="font-medium">フラット ライト</span>
								<span class="text-xs opacity-70">デフォルト</span>
							</button>
							<!-- DB テーマ（組み込みプリセット + カスタム） -->
							{#each themeStore.themes.filter((t) => t.id !== 'theme-builtin-dark' && t.id !== 'theme-builtin-light') as theme (theme.id)}
								<button
									type="button"
									class="flex flex-col gap-1 rounded-lg border px-4 py-3 text-left text-sm transition-[color,background-color,border-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {themeStore.activeMode === theme.id ? 'border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] text-[var(--ag-accent-text)]' : 'border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]'}"
									onclick={() => void themeStore.setThemeMode(theme.id)}
								>
									<span class="font-medium">{theme.name}</span>
									<span class="text-xs opacity-70">{theme.is_builtin ? '組み込み' : 'カスタム'}</span>
								</button>
							{/each}
						</div>
					</div>
				</div>
			{:else if activeCategory === 'sound'}
				<div
					id="settings-panel-sound"
					role="tabpanel"
					aria-labelledby="tab-sound"
					class="space-y-4 px-6 py-5"
				>
					<h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">
						サウンド
					</h3>
					<div class="flex items-center justify-between gap-4">
						<div class="min-w-0">
							<p class="text-sm font-medium text-[var(--ag-text-primary)]">クリック効果音</p>
							<p class="mt-0.5 text-xs text-[var(--ag-text-muted)]">
								ボタン・パレット実行時にクリック音を鳴らす
							</p>
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
								<span class="text-sm tabular-nums text-[var(--ag-text-secondary)]"
									>{Math.round(soundStore.soundVolume * 100)}%</span
								>
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
			{:else if activeCategory === 'data'}
				<div
					id="settings-panel-data"
					role="tabpanel"
					aria-labelledby="tab-data"
					class="space-y-4 px-6 py-5"
				>
					<h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">
						データ
					</h3>
					<ExportImport />
				</div>
			{/if}
		{/if}

		{#if configStore.error}
			<div
				class="mx-5 mb-4 rounded-md border border-[var(--ag-error-border)] bg-[var(--ag-error-bg)] px-3 py-2"
			>
				<p class="text-sm text-[var(--ag-error-text)]">{configStore.error}</p>
			</div>
		{/if}
	</div>
</div>
