<script lang="ts">
/**
 * PH-issue-026 (Issue 23): SystemMonitorSettings polish — 共通 Switch 採用 + clamp 統一。
 * PH-issue-042 (Issue 27/29): ネットワーク表示 toggle + chart_type select 追加。
 * 4/30 user 検収: chart_type を per-metric (CPU / メモリ / ディスク / ネットワーク) で個別 select。
 * PH-CF-500 D7: SYSTEM_MONITOR_DEFAULTS (index.ts) を唯一の出所として import し、
 *   widget 本体と settings で default literal が食い違わないように統一 (= 設定を開く前後で
 *   見た目が変わらない契約)。 各 derived の `?? <literal>` を撤廃。
 */
import Switch from '$lib/components/common/Switch.svelte';
import { t } from '$lib/i18n.svelte';
import { SYSTEM_MONITOR_DEFAULTS } from './index';

type ChartType = 'sparkline' | 'bar' | 'gauge';

interface Props {
	config: {
		refresh_interval_ms?: number;
		show_cpu?: boolean;
		show_memory?: boolean;
		show_disk?: boolean;
		show_network?: boolean;
		cpu_chart_type?: ChartType;
		memory_chart_type?: ChartType;
		disk_chart_type?: ChartType;
		network_chart_type?: ChartType;
		title?: string;
	};
}

let { config = $bindable() }: Props = $props();

let smRefreshMs = $derived(
	config.refresh_interval_ms ?? SYSTEM_MONITOR_DEFAULTS.refresh_interval_ms,
);
let smShowCpu = $derived(config.show_cpu ?? SYSTEM_MONITOR_DEFAULTS.show_cpu);
let smShowMemory = $derived(config.show_memory ?? SYSTEM_MONITOR_DEFAULTS.show_memory);
let smShowDisk = $derived(config.show_disk ?? SYSTEM_MONITOR_DEFAULTS.show_disk);
let smShowNetwork = $derived(config.show_network ?? SYSTEM_MONITOR_DEFAULTS.show_network);
let smCpuChart = $derived<ChartType>(
	config.cpu_chart_type ?? SYSTEM_MONITOR_DEFAULTS.cpu_chart_type,
);
let smMemChart = $derived<ChartType>(
	config.memory_chart_type ?? SYSTEM_MONITOR_DEFAULTS.memory_chart_type,
);
let smDiskChart = $derived<ChartType>(
	config.disk_chart_type ?? SYSTEM_MONITOR_DEFAULTS.disk_chart_type,
);
let smNetChart = $derived<ChartType>(
	config.network_chart_type ?? SYSTEM_MONITOR_DEFAULTS.network_chart_type,
);
let smTitle = $derived(config.title ?? '');
</script>

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-sm-refresh">
		{t('widgets.system_monitor.refresh_label')}
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
	<span class="text-[var(--ag-text-primary)]">{t('widgets.system_monitor.show_cpu_label')}</span>
	<Switch
		checked={smShowCpu}
		onChange={(v) => {
			config = { ...config, show_cpu: v };
		}}
		aria-label={t('widgets.system_monitor.show_cpu_aria')}
	/>
</div>
<div class="flex items-center justify-between gap-3 text-sm">
	<span class="text-[var(--ag-text-primary)]">{t('widgets.system_monitor.show_memory_label')}</span>
	<Switch
		checked={smShowMemory}
		onChange={(v) => {
			config = { ...config, show_memory: v };
		}}
		aria-label={t('widgets.system_monitor.show_memory_aria')}
	/>
</div>
<div class="flex items-center justify-between gap-3 text-sm">
	<span class="text-[var(--ag-text-primary)]">{t('widgets.system_monitor.show_disk_label')}</span>
	<Switch
		checked={smShowDisk}
		onChange={(v) => {
			config = { ...config, show_disk: v };
		}}
		aria-label={t('widgets.system_monitor.show_disk_aria')}
	/>
</div>
<div class="flex items-center justify-between gap-3 text-sm">
	<span class="text-[var(--ag-text-primary)]">{t('widgets.system_monitor.show_network_label')}</span>
	<Switch
		checked={smShowNetwork}
		onChange={(v) => {
			config = { ...config, show_network: v };
		}}
		aria-label={t('widgets.system_monitor.show_network_aria')}
	/>
</div>

<!-- 4/30 user 検収: 各 metric 独立の chart_type 切替。CPU だけでなく メモリ / ディスク / ネットワーク すべて。 -->
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-sm-cpu-chart">
		{t('widgets.system_monitor.cpu_chart_label')}
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
		<option value="sparkline">{t('widgets.system_monitor.chart_sparkline')}</option>
		<option value="bar">{t('widgets.system_monitor.chart_bar')}</option>
		<option value="gauge">{t('widgets.system_monitor.chart_gauge')}</option>
	</select>
</div>
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-sm-mem-chart">
		{t('widgets.system_monitor.memory_chart_label')}
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
		<option value="sparkline">{t('widgets.system_monitor.chart_sparkline')}</option>
		<option value="bar">{t('widgets.system_monitor.chart_bar')}</option>
		<option value="gauge">{t('widgets.system_monitor.chart_gauge')}</option>
	</select>
</div>
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-sm-disk-chart">
		{t('widgets.system_monitor.disk_chart_label')}
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
		<option value="sparkline">{t('widgets.system_monitor.chart_sparkline')}</option>
		<option value="bar">{t('widgets.system_monitor.chart_bar')}</option>
		<option value="gauge">{t('widgets.system_monitor.chart_gauge')}</option>
	</select>
</div>
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-sm-net-chart">
		{t('widgets.system_monitor.network_chart_label')}
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
		<option value="sparkline">{t('widgets.system_monitor.chart_sparkline')}</option>
		<option value="bar">{t('widgets.system_monitor.chart_bar_net')}</option>
	</select>
</div>

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-sm-title">{t('widgets.settings.title_label')}</label>
	<input
		id="ws-sm-title"
		type="text"
		autocomplete="off"
		placeholder={t('widgets.system_monitor.default_title')}
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={smTitle}
		oninput={(e) => {
			config = { ...config, title: (e.currentTarget as HTMLInputElement).value };
		}}
	/>
</div>
