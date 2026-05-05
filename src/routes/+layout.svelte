<script lang="ts">
import '../app.css';
import { onDestroy, onMount } from 'svelte';
import { installErrorMonitor, uninstallErrorMonitor } from '$lib/state/error-monitor.svelte';

let { children } = $props();

// R4-A B-2: Frontend silent fail 検知。
// unhandledrejection / window error を捕捉し toast で user に通知。
onMount(() => {
	installErrorMonitor();
});
onDestroy(() => {
	uninstallErrorMonitor();
});
</script>

{@render children()}
