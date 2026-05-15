<script lang="ts">
import Switch from '$lib/components/common/Switch.svelte';
import { currentLocale, type Locale, setLocale } from '$lib/i18n.svelte';
import { configStore } from '$lib/state/config.svelte';
import HotkeyInput from './HotkeyInput.svelte';
import UpdaterSettings from './UpdaterSettings.svelte';

// audit 2026-05-14 rank 3 Phase 2: Settings Language selector。
// 現在 locale を $derived で reactivity 確保、 ja / en の 2 択 (Phase 3 で en 翻訳追加時に有効化)。
let locale = $derived(currentLocale());

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
	<!-- audit 2026-05-14 rank 3 Phase 2: 言語切替 (Microsoft Store + 海外展開対応、 motivation.md 通り)。
	     Phase 3 で en 翻訳完備時に実用、 現状 ja / en 切替 UI のみ functional (en は ja fallback)。 -->
	<div class="flex items-center justify-between gap-4">
		<div class="min-w-0">
			<p class="text-sm font-medium text-[var(--ag-text-primary)]">表示言語 / Language</p>
			<p class="mt-0.5 text-xs text-[var(--ag-text-muted)]">
				UI の表示言語 (= ja default、 en は Phase 3 で翻訳完備後 fully 対応)
			</p>
		</div>
		<div class="shrink-0">
			<select
				class="rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-1)] px-2 py-1 text-sm text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
				aria-label="表示言語"
				value={locale}
				onchange={(e) => {
					const next = (e.currentTarget as HTMLSelectElement).value as Locale;
					// 永続化 + 再 mount で全 t() callsite に反映 (= reactive 連鎖) +
					// 次回起動時に localStorage 経由で復元 (= +layout の resolveInitialLocale)。
					if (typeof localStorage !== 'undefined') localStorage.setItem('arcagate.locale', next);
					void setLocale(next);
				}}
			>
				<option value="ja">日本語</option>
				<option value="en">English</option>
			</select>
		</div>
	</div>
	<div class="border-t border-[var(--ag-border)] pt-4">
		<UpdaterSettings />
	</div>
</div>
