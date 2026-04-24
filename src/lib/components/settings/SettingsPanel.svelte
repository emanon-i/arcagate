<script lang="ts">
import { Copy, Database, LayoutDashboard, Palette, Plus, Settings2, Volume2 } from '@lucide/svelte';
import type { Component } from 'svelte';
import { configStore } from '$lib/state/config.svelte';
import { soundStore } from '$lib/state/sound.svelte';
import { themeStore } from '$lib/state/theme.svelte';
import AutostartToggle from './AutostartToggle.svelte';
import ExportImport from './ExportImport.svelte';
import HotkeyInput from './HotkeyInput.svelte';
import ThemeEditor from './ThemeEditor.svelte';

type CategoryId = 'general' | 'workspace' | 'appearance' | 'sound' | 'data';

const categories: { id: CategoryId; label: string; icon: Component }[] = [
	{ id: 'general', label: '一般', icon: Settings2 },
	{ id: 'workspace', label: 'ワークスペース', icon: LayoutDashboard },
	{ id: 'appearance', label: '外観', icon: Palette },
	{ id: 'sound', label: 'サウンド', icon: Volume2 },
	{ id: 'data', label: 'データ', icon: Database },
];

let activeCategory = $state<CategoryId>('general');
let editingThemeId = $state<string | null>(null);
let showImportArea = $state(false);
let importJson = $state('');
let importError = $state<string | null>(null);
let copySuccess = $state(false);
const importPlaceholder =
	'{"name": "My Theme", "base_theme": "dark", "css_vars": "{}","is_builtin": false,"created_at": "","updated_at": ""}';

$effect(() => {
	configStore.loadConfig();
});

async function cloneCurrentTheme() {
	const activeId = themeStore.activeMode;
	// 'dark'/'light'/'system' は DB テーマではないので対応する builtin を探す
	const builtinFallback = activeId === 'light' ? 'theme-builtin-light' : 'theme-builtin-dark';
	const themeIdToClone =
		activeId === 'dark' || activeId === 'light' || activeId === 'system'
			? builtinFallback
			: activeId;
	const source = themeStore.themes.find((t) => t.id === themeIdToClone);
	const cssVars = source ? source.css_vars : '{}';
	const baseTheme = source ? source.base_theme : 'dark';
	const baseName = source ? source.name : 'テーマ';
	const created = await themeStore.createTheme(`${baseName} のコピー`, baseTheme, cssVars);
	if (created) {
		await themeStore.setThemeMode(created.id);
		editingThemeId = created.id;
	}
}

async function handleExport(id: string) {
	const json = await themeStore.exportTheme(id);
	if (json) {
		await navigator.clipboard.writeText(json);
		copySuccess = true;
		setTimeout(() => (copySuccess = false), 2000);
	}
}

async function handleImport() {
	importError = null;
	const theme = await themeStore.importTheme(importJson);
	if (theme) {
		importJson = '';
		showImportArea = false;
	} else {
		importError = themeStore.error ?? 'インポートに失敗しました';
	}
}

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
						<div class="mb-3 flex items-center justify-between">
							<p class="text-sm font-medium text-[var(--ag-text-primary)]">テーマ</p>
							<button
								type="button"
								class="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--ag-text-secondary)] transition-colors hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ag-accent)]"
								onclick={cloneCurrentTheme}
							>
								<Plus class="h-3.5 w-3.5" />
								現在のテーマを複製
							</button>
						</div>
						<div class="grid grid-cols-2 gap-2">
							<!-- フラット Dark / Light -->
							<button
								type="button"
								class="flex flex-col gap-1 rounded-lg border px-4 py-3 text-left text-sm transition-[color,background-color,border-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {themeStore.activeMode === 'dark' ? 'border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] text-[var(--ag-accent-text)]' : 'border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]'}"
								onclick={() => { void themeStore.setThemeMode('dark'); editingThemeId = null; }}
							>
								<span class="font-medium">フラット ダーク</span>
								<span class="text-xs opacity-70">デフォルト</span>
							</button>
							<button
								type="button"
								class="flex flex-col gap-1 rounded-lg border px-4 py-3 text-left text-sm transition-[color,background-color,border-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {themeStore.activeMode === 'light' ? 'border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] text-[var(--ag-accent-text)]' : 'border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]'}"
								onclick={() => { void themeStore.setThemeMode('light'); editingThemeId = null; }}
							>
								<span class="font-medium">フラット ライト</span>
								<span class="text-xs opacity-70">デフォルト</span>
							</button>
							<!-- DB テーマ（組み込みプリセット + カスタム） -->
							{#each themeStore.themes.filter((t) => t.id !== 'theme-builtin-dark' && t.id !== 'theme-builtin-light') as theme (theme.id)}
								<div class="flex flex-col gap-1">
									<button
										type="button"
										class="flex flex-1 flex-col gap-1 rounded-lg border px-4 py-3 text-left text-sm transition-[color,background-color,border-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {themeStore.activeMode === theme.id ? 'border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] text-[var(--ag-accent-text)]' : 'border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]'}"
										onclick={() => { void themeStore.setThemeMode(theme.id); editingThemeId = null; }}
									>
										<span class="font-medium">{theme.name}</span>
										<span class="text-xs opacity-70">{theme.is_builtin ? '組み込み' : 'カスタム'}</span>
									</button>
									<div class="flex gap-1 px-1">
										{#if !theme.is_builtin}
											<button
												type="button"
												class="rounded px-2 py-0.5 text-[11px] text-[var(--ag-text-muted)] transition-colors hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ag-accent)]"
												onclick={() => (editingThemeId = editingThemeId === theme.id ? null : theme.id)}
											>
												{editingThemeId === theme.id ? '閉じる' : '編集'}
											</button>
										{/if}
										<button
											type="button"
											class="flex items-center gap-0.5 rounded px-2 py-0.5 text-[11px] text-[var(--ag-text-muted)] transition-colors hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ag-accent)]"
											onclick={() => void handleExport(theme.id)}
										>
											<Copy class="h-3 w-3" />
											{copySuccess ? '✓ コピー済' : 'エクスポート'}
										</button>
									</div>
								</div>
							{/each}
						</div>

						<!-- テーマエディタ（インライン展開） -->
						{#if editingThemeId}
							{@const editingTheme = themeStore.themes.find((t) => t.id === editingThemeId)}
							{#if editingTheme}
								<ThemeEditor
									theme={editingTheme}
									onClose={() => (editingThemeId = null)}
								/>
							{/if}
						{/if}

						<!-- JSON インポート -->
						<div class="mt-4 border-t border-[var(--ag-border)] pt-4">
							<button
								type="button"
								class="text-xs text-[var(--ag-text-muted)] underline-offset-2 hover:text-[var(--ag-text-secondary)] hover:underline focus-visible:outline-none"
								onclick={() => { showImportArea = !showImportArea; importError = null; }}
							>
								JSON からインポート
							</button>
							{#if showImportArea}
								<div class="mt-2 space-y-2">
									<textarea
										bind:value={importJson}
										placeholder={importPlaceholder}
										rows={4}
										class="w-full resize-none rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-2 font-mono text-[11px] text-[var(--ag-text-primary)] placeholder:text-[var(--ag-text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--ag-accent)]"
									></textarea>
									{#if importError}
										<p class="text-xs text-[var(--ag-error-text)]">{importError}</p>
									{/if}
									<button
										type="button"
										disabled={!importJson.trim()}
										class="rounded-md bg-[var(--ag-accent-bg)] px-3 py-1.5 text-xs font-medium text-[var(--ag-accent-text)] transition-colors hover:bg-[var(--ag-accent-active-bg)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ag-accent)]"
										onclick={handleImport}
									>
										インポート
									</button>
								</div>
							{/if}
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
