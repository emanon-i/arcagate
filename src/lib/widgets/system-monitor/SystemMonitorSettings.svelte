<script lang="ts">
/**
 * PH-issue-026 (Issue 23): SystemMonitorSettings polish — 共通 Switch 採用 + clamp 統一。
 * PH-issue-042 (Issue 27/29): ネットワーク表示 toggle + chart_type select 追加。
 * 4/30 user 検収: chart_type を per-metric (CPU / メモリ / ディスク / ネットワーク) で個別 select。
 *  旧 `chart_type` (全 metric 共通) は legacy fallback として残す。
 */
import Switch from '$lib/components/common/Switch.svelte';

type ChartType = 'sparkline' | 'bar' | 'gauge';

interface Props {
	config: {
		refresh_interval_ms?: number;
		show_cpu?: boolean;
		show_memory?: boolean;
		show_disk?: boolean;
		show_network?: boolean;
		chart_type?: ChartType;
		cpu_chart_type?: ChartType;
		memory_chart_type?: ChartType;
		disk_chart_type?: ChartType;
		network_chart_type?: ChartType;
		title?: string;
	};
}

let { config = $bindable() }: Props = $props();

let smRefreshMs = $derived(config.refresh_interval_ms ?? 2000);
let smShowCpu = $derived(config.show_cpu ?? true);
let smShowMemory = $derived(config.show_memory ?? true);
let smShowDisk = $derived(config.show_disk ?? false);
let smShowNetwork = $derived(config.show_network ?? false);
let smCpuChart = $derived<ChartType>(config.cpu_chart_type ?? config.chart_type ?? 'sparkline');
let smMemChart = $derived<ChartType>(config.memory_chart_type ?? config.chart_type ?? 'sparkline');
let smDiskChart = $derived<ChartType>(config.disk_chart_type ?? config.chart_type ?? 'gauge');
let smNetChart = $derived<ChartType>(config.network_chart_type ?? config.chart_type ?? 'sparkline');
let smTitle = $derived(config.title ?? '');
</script>

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-sm-refresh">
		更新間隔（ミリ秒、500〜10000）
	</label>
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
<div class="flex items-center justify-between gap-3 text-sm">
	<span class="text-[var(--ag-text-primary)]">CPU を表示</span>
	<Switch
		checked={smShowCpu}
		onChange={(v) => {
			config = { ...config, show_cpu: v };
		}}
		aria-label="CPU を表示する"
	/>
</div>
<div class="flex items-center justify-between gap-3 text-sm">
	<span class="text-[var(--ag-text-primary)]">メモリを表示</span>
	<Switch
		checked={smShowMemory}
		onChange={(v) => {
			config = { ...config, show_memory: v };
		}}
		aria-label="メモリを表示する"
	/>
</div>
<div class="flex items-center justify-between gap-3 text-sm">
	<span class="text-[var(--ag-text-primary)]">ディスクを表示</span>
	<Switch
		checked={smShowDisk}
		onChange={(v) => {
			config = { ...config, show_disk: v };
		}}
		aria-label="ディスクを表示する"
	/>
</div>
<div class="flex items-center justify-between gap-3 text-sm">
	<span class="text-[var(--ag-text-primary)]">ネットワークを表示</span>
	<Switch
		checked={smShowNetwork}
		onChange={(v) => {
			config = { ...config, show_network: v };
		}}
		aria-label="ネットワークを表示する"
	/>
</div>

<!-- 4/30 user 検収: 各 metric 独立の chart_type 切替。CPU だけでなく メモリ / ディスク / ネットワーク すべて。 -->
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-sm-cpu-chart">
		CPU のグラフ
	</label>
	<select
		id="ws-sm-cpu-chart"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={smCpuChart}
		onchange={(e) => {
			config = {
				...config,
				cpu_chart_type: (e.currentTarget as HTMLSelectElement).value as ChartType,
			};
		}}
	>
		<option value="sparkline">スパークライン (折れ線)</option>
		<option value="bar">バー (横棒)</option>
		<option value="gauge">ゲージ (円弧)</option>
	</select>
</div>
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-sm-mem-chart">
		メモリのグラフ
	</label>
	<select
		id="ws-sm-mem-chart"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={smMemChart}
		onchange={(e) => {
			config = {
				...config,
				memory_chart_type: (e.currentTarget as HTMLSelectElement).value as ChartType,
			};
		}}
	>
		<option value="sparkline">スパークライン (折れ線)</option>
		<option value="bar">バー (横棒)</option>
		<option value="gauge">ゲージ (円弧)</option>
	</select>
</div>
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-sm-disk-chart">
		ディスクのグラフ
	</label>
	<select
		id="ws-sm-disk-chart"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={smDiskChart}
		onchange={(e) => {
			config = {
				...config,
				disk_chart_type: (e.currentTarget as HTMLSelectElement).value as ChartType,
			};
		}}
	>
		<option value="sparkline">スパークライン (折れ線)</option>
		<option value="bar">バー (横棒)</option>
		<option value="gauge">ゲージ (円弧)</option>
	</select>
</div>
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-sm-net-chart">
		ネットワークのグラフ
	</label>
	<select
		id="ws-sm-net-chart"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={smNetChart}
		onchange={(e) => {
			config = {
				...config,
				network_chart_type: (e.currentTarget as HTMLSelectElement).value as ChartType,
			};
		}}
	>
		<option value="sparkline">スパークライン (折れ線)</option>
		<option value="bar">バー (横棒、↓ rx / ↑ tx)</option>
	</select>
</div>

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
