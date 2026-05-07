<script lang="ts">
import { invoke } from '@tauri-apps/api/core';
import '../app.css';
import { onDestroy, onMount } from 'svelte';
import { installErrorMonitor, uninstallErrorMonitor } from '$lib/state/error-monitor.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { installLongtaskObserver, installResourceObserver } from '$lib/utils/perf';

let { children } = $props();

// R4-A B-2: Frontend silent fail 検知。
// unhandledrejection / window error を捕捉し toast で user に通知。
onMount(() => {
	installErrorMonitor();
	// Library hot path 計測用 observer (dev mode のみ)。
	// longtask = main thread 50ms+ block、resource = image / fetch の 100ms+ load。
	installLongtaskObserver();
	installResourceObserver();
	// R10-D E1: 起動直後に直前 panic 情報を consume して toast 表示。
	void (async () => {
		try {
			const json = await invoke<string | null>('cmd_consume_last_panic');
			if (json) {
				const parsed = JSON.parse(json) as { message?: string; location?: string };
				const msg = parsed.message ?? '<unknown>';
				console.error('[panic] previous run crashed:', parsed);
				toastStore.add(`前回の起動で予期しないエラーが発生しました: ${msg}`, 'error');
			}
		} catch {
			// best-effort、IPC 失敗は黙殺
		}
	})();
});
onDestroy(() => {
	uninstallErrorMonitor();
});
</script>

{@render children()}
