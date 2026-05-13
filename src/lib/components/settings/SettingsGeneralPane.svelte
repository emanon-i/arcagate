<script lang="ts">
import Switch from '$lib/components/common/Switch.svelte';
import { configStore } from '$lib/state/config.svelte';
import HotkeyInput from './HotkeyInput.svelte';
import UpdaterSettings from './UpdaterSettings.svelte';

/**
 * Settings の一般カテゴリ pane (hotkey / autostart / updater)。
 *
 * 引用元 guideline:
 *   docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、general pane 抽出)
 *
 * agent judgment: a3 元提案 "SettingsHotkeyPane" は既存 HotkeyInput component で達成済の
 * ため独立 pane を作らず、category 単位の pane (general) として hotkey + autostart + updater を統合。
 */
</script>

<div
	id="settings-panel-general"
	role="tabpanel"
	aria-labelledby="tab-general"
	class="space-y-4 px-6 py-5"
>
	<h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">一般</h3>
	<div class="flex items-start justify-between gap-4">
		<div class="min-w-0">
			<p class="text-sm font-medium text-[var(--ag-text-primary)]">グローバルホットキー</p>
			<p class="mt-0.5 text-xs text-[var(--ag-text-muted)]">
				コマンドパレットを開くショートカット
			</p>
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
			<Switch
				checked={configStore.autostart}
				onChange={(enabled) => configStore.saveAutostart(enabled)}
				aria-label={configStore.autostart ? '自動起動を無効にする' : '自動起動を有効にする'}
			/>
		</div>
	</div>
	<div class="border-t border-[var(--ag-border)] pt-4">
		<UpdaterSettings />
	</div>
</div>
