<script lang="ts">
import '../app.css';
import { onDestroy, onMount } from 'svelte';
import { installErrorMonitor, uninstallErrorMonitor } from '$lib/state/error-monitor.svelte';
import { installLongtaskObserver, installResourceObserver } from '$lib/utils/perf';

let { children } = $props();

// audit 2026-05-13 F12: 旧 `cmd_consume_last_panic` 呼出は backend 未登録で silent fail 状態だった
// (frontend 呼出 → backend 登録漏れ、 try/catch で黙殺 = panic recovery toast は実機で絶対表示されない)。
// panic hook + consume command の full infrastructure は scope 外、 dead path を撤去。
// future: panic::set_hook + file-based last_panic.json + cmd_consume_last_panic 一式実装で復活可。
//
// 2026-05-15: 旧 `setLocale(detectOsLocale())` を撤去。 GitHub Actions Windows runner の
// `navigator.language='en-US'` で auto-detect が常に 'en' を選択、 e2e test の ja selector
// (= `getByPlaceholder('ライブラリを検索')` 等) と不一致で page closed 連鎖 fail を起こした。
// motivation.md は JP-first 方針なので default 'ja' で起動、 Settings Language selector
// (SettingsGeneralPane) で user が能動切替する設計に戻す。 OS auto-detect は将来 i18n test
// 戦略 (= localStorage / URL param で test 時 ja 強制) と一緒に再設計。
onMount(() => {
	installErrorMonitor();
	installLongtaskObserver();
	installResourceObserver();
});
onDestroy(() => {
	uninstallErrorMonitor();
});
</script>

{@render children()}
