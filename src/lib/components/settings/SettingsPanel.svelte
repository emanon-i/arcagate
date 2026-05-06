<script lang="ts">
import type { Component } from 'svelte';
import LoadingState from '$lib/components/common/LoadingState.svelte';
import { NAV_SETTINGS, type NavSettingsId } from '$lib/nav-items';
import { configStore } from '$lib/state/config.svelte';
import AboutSection from './AboutSection.svelte';
import SettingsAppearancePane from './SettingsAppearancePane.svelte';
import SettingsDataPane from './SettingsDataPane.svelte';
import SettingsGeneralPane from './SettingsGeneralPane.svelte';
import SettingsLibraryPane from './SettingsLibraryPane.svelte';

/**
 * Settings facade。
 *
 * 引用元 guideline:
 *   docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、464 LOC を facade + 4 pane に分割)
 *
 * 子 component:
 * - SettingsGeneralPane (hotkey + autostart + updater)
 * - SettingsLibraryPane (LibraryCardSettings + WatchedFoldersSettings + OpenerSettings)
 * - SettingsAppearancePane (theme list + ThemeEditor mount + JSON import)
 * - SettingsDataPane (ExportImport + PrivacySettings)
 *
 * 残: workspace / about category は薄いため facade 内に inline。
 *
 * agent judgment: a3 元提案 "theme/sound/hotkey/opener" 4 pane は実装と乖離 (sound 該当
 * settings 無し / hotkey/opener は既存 sub component 達成済) のため、category 単位の
 * "general/library/appearance/data" 4 pane に再構成。a3 §3.1 の意図 (sub panel 分割) は維持、
 * 命名のみ実装合致に変更。
 */

type CategoryId = NavSettingsId;

const categories: { id: CategoryId; label: string; icon: Component }[] = (
	['general', 'library', 'appearance', 'data', 'about'] as const
).map((id) => ({ id, ...NAV_SETTINGS[id] }));

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

<!-- R6-1: Settings 全体を Industrial Yellow scope に (data-il-zone)。
     CSS で --ag-accent / --ag-accent-text / --ag-accent-bg / --ag-accent-border を
     yellow に override、既存 class はそのままで瞬時に Industrial 化。 -->
<div class="il-zone flex h-full min-h-0" data-il-zone>
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

	<!-- 右: コンテンツ — PH-issue-014: scrollbar-gutter:stable で scroll 出てもコンテンツが移動しない -->
	<div class="min-w-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
		{#if configStore.loading}
			<LoadingState description="設定を読み込み中..." testId="settings-loading" />
		{:else if activeCategory === 'general'}
			<SettingsGeneralPane />
		{:else if activeCategory === 'library'}
			<SettingsLibraryPane />
		{:else if activeCategory === 'appearance'}
			<SettingsAppearancePane />
		{:else if activeCategory === 'data'}
			<SettingsDataPane />
		{:else if activeCategory === 'about'}
			<div
				id="settings-panel-about"
				role="tabpanel"
				aria-labelledby="tab-about"
				class="space-y-4 px-6 py-5"
			>
				<h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">
					このアプリについて
				</h3>
				<AboutSection />
			</div>
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

<style>
/* R6-1: Industrial Yellow accent scope。
   Settings 配下のすべての --ag-accent* を Industrial Yellow に re-bind し、
   class や inline 値を一切変更せずに focus / selected / accent state を瞬時に Industrial 化。
   scope 外 (Library / Workspace 等) は元 cyan accent のまま。 */
.il-zone {
	--ag-accent: var(--ag-il-yellow);
	--ag-accent-text: var(--ag-il-on-yellow);
	--ag-accent-bg: color-mix(in srgb, var(--ag-il-yellow) 12%, transparent);
	--ag-accent-border: color-mix(in srgb, var(--ag-il-yellow) 40%, transparent);
	--ag-accent-active-bg: color-mix(in srgb, var(--ag-il-yellow) 18%, transparent);
	--ag-accent-active-border: color-mix(in srgb, var(--ag-il-yellow) 50%, transparent);
}
</style>
