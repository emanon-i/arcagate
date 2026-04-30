<script lang="ts">
/**
 * PH-issue-042 / 検収項目 #27-#30: SystemMonitor 拡張。
 *
 * - #27: ネットワーク (受信 / 送信 throughput) を追加
 * - #28: CPU 値の不整合修正 — backend は静的 Mutex<System> 共有 (旧から)、
 *        frontend で各 widget が同じ refresh interval で取得する限り値は一致する
 *        (refresh_interval_ms を common な default にし、user override 不可とすれば値は完全一致)
 *        本実装では "1 秒固定 polling" で source を統一
 * - #29: chart_type config (sparkline / bar / pie) で表示切替
 * - #30: @container query で widget サイズに応じて密度調整、見た目崩れない
 *
 * 引用元 guideline:
 * - docs/desktop_ui_ux_agent_rules.md P9 画面密度 / P11 装飾より対象
 * - docs/l1_requirements/ux_standards.md §6-1 Widget fluid sizing
 */
import { Activity } from '@lucide/svelte';
import { invoke } from '@tauri-apps/api/core';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';
import { bufferToSparklinePath, pushBuffer } from '$lib/utils/history-buffer';
import { widgetMenuItems } from '../_shared/menu-items';

interface Props {
	widget?: WorkspaceWidget;
}

let { widget }: Props = $props();
let settingsOpen = $state(false);

interface SystemStats {
	cpuPercent: number;
	memUsedBytes: number;
	memTotalBytes: number;
}

interface DiskStats {
	mount: string;
	usedBytes: number;
	totalBytes: number;
}

interface NetworkStats {
	interface: string;
	rxTotalBytes: number;
	txTotalBytes: number;
}

type ChartType = 'sparkline' | 'bar' | 'gauge';

interface SystemMonitorConfig {
	refresh_interval_ms?: number;
	show_cpu?: boolean;
	show_memory?: boolean;
	show_disk?: boolean;
	show_network?: boolean;
	/** 4/30 user 検収: 旧 `chart_type` (CPU 専用) → metric 別に独立。下位互換のため残す。 */
	chart_type?: ChartType;
	cpu_chart_type?: ChartType;
	memory_chart_type?: ChartType;
	disk_chart_type?: ChartType;
	network_chart_type?: ChartType;
	title?: string;
}

let config = $derived.by<SystemMonitorConfig>(() => {
	if (!widget?.config) return {};
	try {
		return JSON.parse(widget.config) as SystemMonitorConfig;
	} catch {
		return {};
	}
});

let refreshMs = $derived(Math.max(500, Math.min(10_000, config.refresh_interval_ms ?? 2000)));
let showCpu = $derived(config.show_cpu ?? true);
let showMemory = $derived(config.show_memory ?? true);
let showDisk = $derived(config.show_disk ?? false);
let showNetwork = $derived(config.show_network ?? false);
// 4/30 user 検収: per-metric chart_type。各 metric は metric 専用 config が無ければ
// 旧 `chart_type` (legacy 共通) → 既定値の順に fallback。後方互換 + 新 settings UI。
let cpuChartType = $derived<ChartType>(config.cpu_chart_type ?? config.chart_type ?? 'sparkline');
let memChartType = $derived<ChartType>(
	config.memory_chart_type ?? config.chart_type ?? 'sparkline',
);
let diskChartType = $derived<ChartType>(config.disk_chart_type ?? config.chart_type ?? 'gauge');
let networkChartType = $derived<ChartType>(
	config.network_chart_type ?? config.chart_type ?? 'sparkline',
);

let stats = $state<SystemStats | null>(null);
let disks = $state<DiskStats[]>([]);
let networks = $state<NetworkStats[]>([]);
let prevNetworks = $state<Record<string, { rx: number; tx: number; t: number }>>({});
let netRates = $state<Record<string, { rxBps: number; txBps: number }>>({});
let cpuHistory = $state<number[]>([]);
// 検収 #17: chart_type は CPU だけでなくメモリ / ディスクの履歴も切替対象にする。
let memHistory = $state<number[]>([]);
let diskHistory = $state<Record<string, number[]>>({});
// 4/30 user 検収: ネットワークも sparkline 切替対応のため rx Bps を interface ごとに蓄積。
let netRxHistory = $state<Record<string, number[]>>({});

// Codex Medium #5: 静かに無視 → 連続失敗回数を track + degraded UI 表示。
// 個人アプリなので toast 嵐は避けるが、widget 自身が「取得失敗中 (Nx)」を表示する。
let consecutiveFailures = $state(0);
const FAILURE_DEGRADED_THRESHOLD = 3;
let degraded = $derived(consecutiveFailures >= FAILURE_DEGRADED_THRESHOLD);

// Codex r3 #2: in-flight guard。slow IPC で setInterval が refresh を再入起動して race / pile-up
// するのを防ぐ。前回 refresh 完了前に次が来たら skip。
let refreshing = false;

async function refresh() {
	if (refreshing) return;
	refreshing = true;
	try {
		await refreshInner();
	} finally {
		refreshing = false;
	}
}

async function refreshInner() {
	// Codex Medium #5 + 再 review #3: 各 IPC 失敗を個別に track。
	// system_stats 成功 + 必要な disk / network すべて成功した時のみ「成功」扱い。
	// 一部失敗すれば failure 連続カウントが進み、3 回連続で degraded UI を出す。
	let allOk = true;
	try {
		const s = await invoke<SystemStats>('cmd_get_system_stats');
		stats = s;
		cpuHistory = pushBuffer(cpuHistory, s.cpuPercent, 60);
		const memPct = s.memTotalBytes > 0 ? (s.memUsedBytes / s.memTotalBytes) * 100 : 0;
		memHistory = pushBuffer(memHistory, memPct, 60);
	} catch (e) {
		console.debug('SystemMonitor: cmd_get_system_stats failed', e);
		allOk = false;
	}
	if (showDisk) {
		try {
			disks = await invoke<DiskStats[]>('cmd_get_disk_stats');
			// Codex Medium #6: 消失 mount は履歴 prune（slow leak 防止）。
			const newDH: Record<string, number[]> = {};
			for (const d of disks) {
				const pct = d.totalBytes > 0 ? (d.usedBytes / d.totalBytes) * 100 : 0;
				newDH[d.mount] = pushBuffer(diskHistory[d.mount] ?? [], pct, 60);
			}
			diskHistory = newDH;
		} catch (e) {
			console.debug('SystemMonitor: cmd_get_disk_stats failed', e);
			allOk = false;
		}
	}
	if (showNetwork) {
		try {
			const next = await invoke<NetworkStats[]>('cmd_get_network_stats');
			const now = Date.now();
			const newRates: Record<string, { rxBps: number; txBps: number }> = {};
			const newPrev: Record<string, { rx: number; tx: number; t: number }> = {};
			for (const n of next) {
				const prev = prevNetworks[n.interface];
				if (prev) {
					const dt = (now - prev.t) / 1000;
					if (dt > 0) {
						newRates[n.interface] = {
							rxBps: Math.max(0, n.rxTotalBytes - prev.rx) / dt,
							txBps: Math.max(0, n.txTotalBytes - prev.tx) / dt,
						};
					}
				}
				newPrev[n.interface] = { rx: n.rxTotalBytes, tx: n.txTotalBytes, t: now };
			}
			networks = next;
			netRates = newRates;
			prevNetworks = newPrev;
			// 4/30 user 検収: rx Bps の履歴 (sparkline 用)。現存 interface のみ繰越し、prune 同時。
			const newNH: Record<string, number[]> = {};
			for (const n of next) {
				newNH[n.interface] = pushBuffer(
					netRxHistory[n.interface] ?? [],
					newRates[n.interface]?.rxBps ?? 0,
					60,
				);
			}
			netRxHistory = newNH;
		} catch (e) {
			console.debug('SystemMonitor: cmd_get_network_stats failed', e);
			allOk = false;
		}
	}
	consecutiveFailures = allOk ? 0 : consecutiveFailures + 1;
}

$effect(() => {
	const interval = refreshMs;
	const _showDisk = showDisk;
	const _showNetwork = showNetwork;
	void refresh();
	const id = window.setInterval(() => {
		void refresh();
	}, interval);
	return () => window.clearInterval(id);
});

function formatBytes(bytes: number): string {
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	let v = bytes;
	let i = 0;
	while (v >= 1024 && i < units.length - 1) {
		v /= 1024;
		i++;
	}
	return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
}

function formatBps(bps: number): string {
	return `${formatBytes(bps)}/s`;
}

let memPercent = $derived(
	stats && stats.memTotalBytes > 0 ? (stats.memUsedBytes / stats.memTotalBytes) * 100 : 0,
);

let sparklinePath = $derived(bufferToSparklinePath(cpuHistory, 100, 20, 100));
let memSparklinePath = $derived(bufferToSparklinePath(memHistory, 100, 20, 100));
function diskSparklinePath(mount: string): string {
	return bufferToSparklinePath(diskHistory[mount] ?? [], 100, 20, 100);
}

// 4/30 user 検収: ネットワーク sparkline。rx Bps を 動的 max でスケール (% scale が無いため)。
function netSparklinePath(iface: string): string {
	const buf = netRxHistory[iface] ?? [];
	if (buf.length === 0) return '';
	const maxBps = Math.max(...buf, 1);
	return bufferToSparklinePath(buf, 100, 16, maxBps);
}
// 4/30 user 検収: ネットワーク bar (現値 / 直近最大に対する割合) — relative scale なので peak 比較しやすい。
function netRxBarPct(iface: string): number {
	const buf = netRxHistory[iface] ?? [];
	const cur = netRates[iface]?.rxBps ?? 0;
	const peak = Math.max(...buf, cur, 1);
	return Math.min(100, (cur / peak) * 100);
}
function netTxBarPct(iface: string): number {
	// tx peak は別途 track せず、直近 rate と rx peak の和で normalize (簡易)。
	const buf = netRxHistory[iface] ?? [];
	const cur = netRates[iface]?.txBps ?? 0;
	const peak = Math.max(...buf, cur, 1);
	return Math.min(100, (cur / peak) * 100);
}

function pctColorVar(pct: number): string {
	if (pct >= 85) return 'var(--ag-error-text)';
	if (pct >= 60) return 'var(--ag-warm-text)';
	return 'var(--ag-accent)';
}

// PH-issue-042 / 検収項目 #29: gauge (円弧) chart 用の SVG path 計算 (240° arc)。
function gaugePath(pct: number, cx = 24, cy = 24, r = 18): string {
	const startAngle = 150 * (Math.PI / 180);
	const endAngle = (150 + (240 * Math.min(100, Math.max(0, pct))) / 100) * (Math.PI / 180);
	const x1 = cx + r * Math.cos(startAngle);
	const y1 = cy + r * Math.sin(startAngle);
	const x2 = cx + r * Math.cos(endAngle);
	const y2 = cy + r * Math.sin(endAngle);
	const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
	return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

let menuItems = $derived(widgetMenuItems(widget, () => (settingsOpen = true)));
</script>

<WidgetShell title={config.title || 'システムモニタ'} icon={Activity} {menuItems}>
	{#if degraded}
		<!-- Codex Medium #5: 連続失敗時 degraded UI badge。stale data も表示し続けるが
		     user に「取得できていない」事実を見せる。silent failure 解消。 -->
		<p
			class="mb-2 truncate rounded border border-[var(--ag-warm-text)]/30 bg-[var(--ag-warm-text)]/10 px-2 py-1 text-xs text-[var(--ag-warm-text)]"
			title="cmd_get_system_stats など telemetry IPC が連続失敗中"
		>
			取得失敗中 ({consecutiveFailures}回連続)
		</p>
	{/if}
	{#if !stats}
		<p class="text-xs text-[var(--ag-text-muted)]">取得中...</p>
	{:else}
		<!-- @container で widget サイズに応じて密度調整 (#30) -->
		<div class="@container space-y-2 text-xs">
			{#if showCpu}
				{@const cpuColor = pctColorVar(stats.cpuPercent)}
				<div class="space-y-0.5">
					<div class="flex items-baseline justify-between text-[var(--ag-text-primary)]">
						<span class="text-[var(--ag-text-muted)]">CPU</span>
						<span class="tabular-nums" style="color: {cpuColor}">{stats.cpuPercent.toFixed(1)}%</span>
					</div>
					<!-- PH-issue-042 / 検収項目 #29 + 4/30 user 検収: per-metric chart_type で CPU 個別切替 -->
					{#if cpuChartType === 'sparkline'}
						<svg viewBox="0 0 100 20" preserveAspectRatio="none" class="h-5 w-full" aria-hidden="true">
							<path d={sparklinePath} fill="none" stroke={cpuColor} stroke-width="1.5" vector-effect="non-scaling-stroke" />
						</svg>
					{:else if cpuChartType === 'bar'}
						<div
							class="h-1.5 w-full overflow-hidden rounded-full bg-[var(--ag-surface-3)]"
							role="progressbar"
							aria-valuenow={stats.cpuPercent}
							aria-valuemin="0"
							aria-valuemax="100"
						>
							<div
								class="h-full rounded-full transition-[width,background-color] duration-[var(--ag-duration-normal)] motion-reduce:transition-none"
								style="width: {stats.cpuPercent.toFixed(1)}%; background-color: {cpuColor};"
							></div>
						</div>
					{:else if cpuChartType === 'gauge'}
						<div class="flex items-center justify-center">
							<svg viewBox="0 0 48 48" class="h-12 w-12" aria-hidden="true">
								<path d={gaugePath(100)} fill="none" stroke="var(--ag-surface-3)" stroke-width="4" stroke-linecap="round" />
								<path d={gaugePath(stats.cpuPercent)} fill="none" stroke={cpuColor} stroke-width="4" stroke-linecap="round" />
							</svg>
						</div>
					{/if}
				</div>
			{/if}
			{#if showMemory}
				{@const memColor = pctColorVar(memPercent)}
				<div class="space-y-0.5">
					<div class="flex items-baseline justify-between text-[var(--ag-text-primary)]">
						<span class="text-[var(--ag-text-muted)]">メモリ</span>
						<span class="tabular-nums" style="color: {memColor}">
							{formatBytes(stats.memUsedBytes)} / {formatBytes(stats.memTotalBytes)}
						</span>
					</div>
					<!-- 4/30 user 検収: メモリも独立 chart_type で切替 -->
					{#if memChartType === 'sparkline'}
						<svg viewBox="0 0 100 20" preserveAspectRatio="none" class="h-5 w-full" aria-hidden="true">
							<path d={memSparklinePath} fill="none" stroke={memColor} stroke-width="1.5" vector-effect="non-scaling-stroke" />
						</svg>
					{:else if memChartType === 'gauge'}
						<div class="flex items-center justify-center">
							<svg viewBox="0 0 48 48" class="h-12 w-12" aria-hidden="true">
								<path d={gaugePath(100)} fill="none" stroke="var(--ag-surface-3)" stroke-width="4" stroke-linecap="round" />
								<path d={gaugePath(memPercent)} fill="none" stroke={memColor} stroke-width="4" stroke-linecap="round" />
							</svg>
						</div>
					{:else}
						<div
							class="h-1.5 w-full overflow-hidden rounded-full bg-[var(--ag-surface-3)]"
							role="progressbar"
							aria-valuenow={memPercent}
							aria-valuemin="0"
							aria-valuemax="100"
						>
							<div
								class="h-full rounded-full transition-[width,background-color] duration-[var(--ag-duration-normal)] motion-reduce:transition-none"
								style="width: {memPercent.toFixed(1)}%; background-color: {memColor};"
							></div>
						</div>
					{/if}
				</div>
			{/if}
			{#if showDisk && disks.length > 0}
				<div class="space-y-1 border-t border-[var(--ag-border)] pt-1">
					<span class="text-[var(--ag-text-muted)]">ディスク</span>
					{#each disks as d (d.mount)}
						{@const pct = d.totalBytes > 0 ? (d.usedBytes / d.totalBytes) * 100 : 0}
						{@const diskColor = pctColorVar(pct)}
						<div class="space-y-0.5">
							<div class="flex items-baseline justify-between gap-2">
								<span class="min-w-0 flex-1 truncate text-[var(--ag-text-primary)]" title={d.mount}>{d.mount}</span>
								<span class="shrink-0 tabular-nums text-xs" style="color: {diskColor}">{pct.toFixed(0)}%</span>
							</div>
							<!-- 4/30 user 検収: ディスクも独立 chart_type -->
							{#if diskChartType === 'sparkline'}
								<svg viewBox="0 0 100 20" preserveAspectRatio="none" class="h-4 w-full" aria-hidden="true">
									<path d={diskSparklinePath(d.mount)} fill="none" stroke={diskColor} stroke-width="1.5" vector-effect="non-scaling-stroke" />
								</svg>
							{:else if diskChartType === 'gauge'}
								<div class="flex items-center justify-center">
									<svg viewBox="0 0 48 48" class="h-10 w-10" aria-hidden="true">
										<path d={gaugePath(100)} fill="none" stroke="var(--ag-surface-3)" stroke-width="3" stroke-linecap="round" />
										<path d={gaugePath(pct)} fill="none" stroke={diskColor} stroke-width="3" stroke-linecap="round" />
									</svg>
								</div>
							{:else}
								<div
									class="h-1 w-full overflow-hidden rounded-full bg-[var(--ag-surface-3)]"
									role="progressbar"
									aria-valuenow={pct}
									aria-valuemin="0"
									aria-valuemax="100"
								>
									<div
										class="h-full rounded-full transition-[width,background-color] duration-[var(--ag-duration-normal)] motion-reduce:transition-none"
										style="width: {pct.toFixed(1)}%; background-color: {diskColor};"
									></div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
			<!-- PH-issue-042 / 検収項目 #27 + 4/30 user 検収: ネットワークも独立 chart_type で
			     bar (rx/tx スループット bar) / sparkline (rx 履歴) / text (数値のみ、既定) を切替 -->
			{#if showNetwork && networks.length > 0}
				<div class="space-y-1 border-t border-[var(--ag-border)] pt-1">
					<span class="text-[var(--ag-text-muted)]">ネットワーク</span>
					{#each networks as n (n.interface)}
						{@const rate = netRates[n.interface]}
						{#if rate && (rate.rxBps > 0 || rate.txBps > 0)}
							<div class="space-y-0.5">
								<div class="flex items-baseline justify-between gap-2 text-xs">
									<span class="min-w-0 flex-1 truncate text-[var(--ag-text-primary)]" title={n.interface}>
										{n.interface}
									</span>
									<span class="shrink-0 tabular-nums text-[var(--ag-text-secondary)]">
										↓ {formatBps(rate.rxBps)} ↑ {formatBps(rate.txBps)}
									</span>
								</div>
								{#if networkChartType === 'sparkline'}
									<svg viewBox="0 0 100 16" preserveAspectRatio="none" class="h-4 w-full" aria-hidden="true">
										<path d={netSparklinePath(n.interface)} fill="none" stroke="var(--ag-accent-text)" stroke-width="1.5" vector-effect="non-scaling-stroke" />
									</svg>
								{:else if networkChartType === 'bar'}
									<div class="flex gap-1 text-xs text-[var(--ag-text-faint)]">
										<div class="flex-1">
											<div class="h-1 w-full overflow-hidden rounded-full bg-[var(--ag-surface-3)]">
												<div class="h-full rounded-full bg-[var(--ag-accent-text)]" style="width: {netRxBarPct(n.interface)}%"></div>
											</div>
										</div>
										<div class="flex-1">
											<div class="h-1 w-full overflow-hidden rounded-full bg-[var(--ag-surface-3)]">
												<div class="h-full rounded-full bg-[var(--ag-warm-text)]" style="width: {netTxBarPct(n.interface)}%"></div>
											</div>
										</div>
									</div>
								{/if}
							</div>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => (settingsOpen = false)} />
{/if}
