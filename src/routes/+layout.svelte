<script lang="ts">
import '../app.css';
import { onDestroy, onMount } from 'svelte';
import ScriptLaunchConfirmDialog from '$lib/components/common/ScriptLaunchConfirmDialog.svelte';
import { detectOsLocale, type Locale, setLocale } from '$lib/i18n.svelte';
import { installErrorMonitor, uninstallErrorMonitor } from '$lib/state/error-monitor.svelte';
import { installLongtaskObserver, installResourceObserver } from '$lib/utils/perf';

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

// audit 2026-05-13 F12: 旧 `cmd_consume_last_panic` 呼出は backend 未登録で silent fail 状態だった
// (frontend 呼出 → backend 登録漏れ、 try/catch で黙殺 = panic recovery toast は実機で絶対表示されない)。
// panic hook + consume command の full infrastructure は scope 外、 dead path を撤去。
// future: panic::set_hook + file-based last_panic.json + cmd_consume_last_panic 一式実装で復活可。
onMount(() => {
	installErrorMonitor();
	installLongtaskObserver();
	installResourceObserver();
	// rank 3 Phase 2 fix: test 強制 > 保存済 > OS auto-detect > ja fallback。
	void setLocale(resolveInitialLocale());
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

{@render children()}

<!-- audit F15: Command / Script 初回起動確認ダイアログ (全 launch 経路 共通、 root に 1 度 mount) -->
<ScriptLaunchConfirmDialog />
