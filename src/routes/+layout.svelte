<script lang="ts">
import '../app.css';
// a11y トグル (透明度 / コントラスト / 動き) を起動時に <html> へ即時反映する side-effect import。
import '$lib/state/a11y.svelte';
import { onDestroy, onMount } from 'svelte';
import DbRecoveryBanner from '$lib/components/arcagate/common/DbRecoveryBanner.svelte';
import ScriptLaunchConfirmDialog from '$lib/components/common/ScriptLaunchConfirmDialog.svelte';
import { detectOsLocale, type Locale, setLocale, t } from '$lib/i18n.svelte';
import { takeStartupNotices } from '$lib/ipc/config';
import { installErrorMonitor, uninstallErrorMonitor } from '$lib/state/error-monitor.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { installLongtaskObserver, installResourceObserver, markStartupFe } from '$lib/utils/perf';
// Library 遷移 timeline collector (prototype): 起動時に window.__agTimeline__ を用意する。
import '$lib/utils/perf-timeline';

let { children } = $props();

const LOCALE_STORAGE_KEY = 'arcagate.locale';
const TEST_LOCALE_OVERRIDE_KEY = 'arcagate.test.force_locale';

/**
 * 起動時 locale 解決: 「test 強制 > 保存済 > OS auto-detect > ja fallback」 の優先順。
 *
 * 2026-05-15 fix: 旧実装は `setLocale(detectOsLocale())` だけで OS locale を即適用していた。
 * GitHub Actions Windows runner の `navigator.language='en-US'` で常に en active になり、
 * e2e の ja-hardcode selector (`getByPlaceholder('ライブラリを検索')` 等) と不一致 → page
 * closed 連鎖 fail を起こした。 test 強制 key を最優先にすることで e2e から ja 固定が可能。
 * #474 で auto-detect を一旦撤去したが、 本 PR で「優先順位ベース + test 固定機構」 として復活。
 *
 * - test 環境: tests/fixtures/global-setup.ts が `arcagate.test.force_locale='ja'` を pre-inject
 * - production: `arcagate.locale` に Settings で保存した値 (= user の能動選択) を最優先
 * - 初回起動: OS locale で auto-detect (ja-* → ja、 en-* → en、 他 → ja fallback)
 */
function resolveInitialLocale(): Locale {
	if (typeof localStorage === 'undefined') return 'ja';
	const forced = localStorage.getItem(TEST_LOCALE_OVERRIDE_KEY);
	if (forced === 'ja' || forced === 'en') return forced;
	const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
	if (saved === 'ja' || saved === 'en') return saved;
	return detectOsLocale();
}

/**
 * PH-PQ-100 T4: 起動時 self-recovery 通知 → toast。
 * notice code (backend) → i18n toast キーの対応表。 未知 code は無視する。
 */
const STARTUP_NOTICE_TOAST: Record<string, string> = {
	'config.hotkey_recovered': 'toast.config_recovered_to_default',
};

async function showStartupNotices(): Promise<void> {
	try {
		const codes = await takeStartupNotices();
		for (const code of codes) {
			const key = STARTUP_NOTICE_TOAST[code];
			if (key) toastStore.add(t(key), 'info');
		}
	} catch {
		// 通知取得失敗は起動の妨げにしない (best-effort)。
	}
}

// PH-PQ-100 T2: panic hook の full infrastructure を実装済 (src-tauri/src/panic_hook.rs)。
// 旧 `cmd_consume_last_panic` 経路は撤去済 — panic 時は backend の panic_hook が
// log + WAL checkpoint + native dialog を担う。 起動時 config 破損などの軽度 recovery は
// 下記 showStartupNotices() で toast 表示する (T4)。
onMount(() => {
	// PH-CF-900 A1: 起動段階 instrumentation。 `+layout.svelte` mount = SvelteKit hydration
	// 完了の最初の hook (= WebView2 が JS を実行可能になり Svelte component tree が
	// mount された時点)。 backend setup (perf:startup) との gap がここまでで取れる。
	markStartupFe('layout_mount');
	installErrorMonitor();
	installLongtaskObserver();
	installResourceObserver();
	// rank 3 Phase 2 fix: test 強制 > 保存済 > OS auto-detect > ja fallback。
	void setLocale(resolveInitialLocale());
	void showStartupNotices();
});
onDestroy(() => {
	uninstallErrorMonitor();
});

/**
 * 2026-05-17 user 検収: ブラウザ / OS のデフォルトコンテキストメニューを全画面で抑止。
 * 各画面は専用 context menu を実装する。 input / textarea / contenteditable は
 * コピペ等の native menu が必要なため抑止対象から除外する。
 */
function handleGlobalContextMenu(e: MouseEvent): void {
	const target = e.target as HTMLElement | null;
	if (target?.closest('input, textarea, [contenteditable="true"]')) return;
	e.preventDefault();
}
</script>

<svelte:window oncontextmenu={handleGlobalContextMenu} />

<!--
	DB self-recovery 永続 banner (2026-05-27 新設)。 backend marker file が
	存在する限り再表示される sticky banner。 詳細は DbRecoveryBanner.svelte 参照。
-->
<DbRecoveryBanner />

{@render children()}

<!-- audit F15: Command / Script 初回起動確認ダイアログ (全 launch 経路 共通、 root に 1 度 mount) -->
<ScriptLaunchConfirmDialog />
