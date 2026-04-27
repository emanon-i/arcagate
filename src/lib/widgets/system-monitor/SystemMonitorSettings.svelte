<script lang="ts">
interface Props {
	config: {
		refresh_interval_ms?: number;
		show_cpu?: boolean;
		show_memory?: boolean;
		show_disk?: boolean;
		title?: string;
	};
}

let { config = $bindable() }: Props = $props();

let smRefreshMs = $derived(config.refresh_interval_ms ?? 2000);
let smShowCpu = $derived(config.show_cpu ?? true);
let smShowMemory = $derived(config.show_memory ?? true);
let smShowDisk = $derived(config.show_disk ?? false);
let smTitle = $derived(config.title ?? '');
</script>

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-sm-refresh">更新間隔（ミリ秒、500〜10000）</label>
	<input
		id="ws-sm-refresh"
		type="number"
		min="500"
		max="10000"
		step="100"
		autocomplete="off"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={smRefreshMs}
		onchange={(e) => {
			config = {
				...config,
				refresh_interval_ms: Math.max(
					500,
					Math.min(10_000, Number((e.currentTarget as HTMLInputElement).value) || 2000),
				),
			};
		}}
	/>
</div>
<label class="flex items-center justify-between gap-3 text-sm">
	<span class="text-[var(--ag-text-primary)]">CPU を表示</span>
	<input
		type="checkbox"
		checked={smShowCpu}
		onchange={(e) => {
			config = { ...config, show_cpu: (e.currentTarget as HTMLInputElement).checked };
		}}
		class="h-4 w-4 cursor-pointer accent-[var(--ag-accent-text)]"
	/>
</label>
<label class="flex items-center justify-between gap-3 text-sm">
	<span class="text-[var(--ag-text-primary)]">メモリを表示</span>
	<input
		type="checkbox"
		checked={smShowMemory}
		onchange={(e) => {
			config = { ...config, show_memory: (e.currentTarget as HTMLInputElement).checked };
		}}
		class="h-4 w-4 cursor-pointer accent-[var(--ag-accent-text)]"
	/>
</label>
<label class="flex items-center justify-between gap-3 text-sm">
	<span class="text-[var(--ag-text-primary)]">ディスクを表示</span>
	<input
		type="checkbox"
		checked={smShowDisk}
		onchange={(e) => {
			config = { ...config, show_disk: (e.currentTarget as HTMLInputElement).checked };
		}}
		class="h-4 w-4 cursor-pointer accent-[var(--ag-accent-text)]"
	/>
</label>
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-sm-title">タイトル</label>
	<input
		id="ws-sm-title"
		type="text"
		autocomplete="off"
		placeholder="システムモニタ"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={smTitle}
		oninput={(e) => {
			config = { ...config, title: (e.currentTarget as HTMLInputElement).value };
		}}
	/>
</div>
