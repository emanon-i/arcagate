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
