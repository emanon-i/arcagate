<script lang="ts">
import { Activity, RotateCcw } from '@lucide/svelte';
import { invoke } from '@tauri-apps/api/core';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';
import { getErrorMessage } from '$lib/utils/format-error';
import { bufferToSparklinePath, pushBuffer } from '$lib/utils/history-buffer';

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

interface SystemMonitorConfig {
	refresh_interval_ms?: number;
	show_cpu?: boolean;
	show_memory?: boolean;
	show_disk?: boolean;
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

let stats = $state<SystemStats | null>(null);
let disks = $state<DiskStats[]>([]);
let cpuHistory = $state<number[]>([]);
// PH-507: error state を表に出す (連続失敗を user に伝える + retry)
let lastError = $state<string | null>(null);
let consecutiveFailures = $state(0);

async function refresh() {
	try {
		const s = await invoke<SystemStats>('cmd_get_system_stats');
		stats = s;
		cpuHistory = pushBuffer(cpuHistory, s.cpuPercent, 60);
		lastError = null;
		consecutiveFailures = 0;
	} catch (e: unknown) {
		consecutiveFailures += 1;
		// 3 回連続失敗で error state を出す (一時 glitch との区別)
		if (consecutiveFailures >= 3) {
			lastError = getErrorMessage(e);
		}
	}
	if (showDisk && stats) {
		try {
			disks = await invoke<DiskStats[]>('cmd_get_disk_stats');
		} catch {
			// disk 取得失敗は silent (CPU/MEM が出ていればコア機能は維持)
		}
	}
}

$effect(() => {
	const interval = refreshMs;
	const _showDisk = showDisk;
	void refresh();
	const id = window.setInterval(() => {
		void refresh();
	}, interval);
	return () => window.clearInterval(id);
});

function manualRetry() {
	consecutiveFailures = 0;
	lastError = null;
	void refresh();
}

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

let memPercent = $derived(
	stats && stats.memTotalBytes > 0 ? (stats.memUsedBytes / stats.memTotalBytes) * 100 : 0,
);

let sparklinePath = $derived(bufferToSparklinePath(cpuHistory, 100, 20, 100));

let menuItems = $derived(
	widget
		? [
				{
					label: '設定',
					onclick: () => {
						settingsOpen = true;
					},
				},
			]
		: [],
);
</script>

<WidgetShell title={config.title || 'システムモニタ'} icon={Activity} {menuItems}>
	<!--
		PH-507: container query で S/M/L responsive、error state を露出。
		S (< 200px): sparkline 非表示、label を CPU/MEM/DSK に短縮 (CSS で出し分け)
		M/L: 全表示
	-->
	<div class="sysmon-container h-full">
		{#if lastError}
			<div
				class="flex flex-col items-start gap-2 text-ag-xs"
				data-testid="sysmon-error"
				role="alert"
			>
				<p class="text-[var(--ag-text-error)]">取得失敗: {lastError}</p>
				<button
					type="button"
					class="flex items-center gap-1 rounded border border-[var(--ag-border)] px-2 py-0.5 text-ag-xs text-[var(--ag-text-secondary)] transition-colors hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
					aria-label="システム情報を再取得"
					onclick={manualRetry}
				>
					<RotateCcw class="h-3 w-3" />
					再試行
				</button>
			</div>
		{:else if !stats}
			<!-- skeleton ベースの loading state (PH-507: text のみ → bar + animate-pulse へ昇格) -->
			<div class="space-y-2" data-testid="sysmon-loading" aria-live="polite" aria-busy="true">
				<div class="h-3 w-1/2 animate-pulse rounded bg-[var(--ag-surface-3)]"></div>
				<div class="h-5 w-full animate-pulse rounded bg-[var(--ag-surface-3)]"></div>
				<div class="h-3 w-2/3 animate-pulse rounded bg-[var(--ag-surface-3)]"></div>
			</div>
		{:else}
			<div class="space-y-2 text-ag-xs">
				{#if showCpu}
					<div class="space-y-0.5">
						<div class="flex items-baseline justify-between text-[var(--ag-text-primary)]">
							<span class="text-[var(--ag-text-muted)]">CPU</span>
							<span class="tabular-nums">{stats.cpuPercent.toFixed(1)}%</span>
						</div>
						<svg
							viewBox="0 0 100 20"
							preserveAspectRatio="none"
							class="sysmon-sparkline h-5 w-full"
							aria-hidden="true"
						>
							<path
								d={sparklinePath}
								fill="none"
								stroke="var(--ag-accent)"
								stroke-width="1.5"
								vector-effect="non-scaling-stroke"
							/>
						</svg>
					</div>
				{/if}
				{#if showMemory}
					<div class="space-y-0.5">
						<div class="flex items-baseline justify-between text-[var(--ag-text-primary)]">
							<span class="text-[var(--ag-text-muted)]">メモリ</span>
							<span class="sysmon-mem-detail tabular-nums">
								{formatBytes(stats.memUsedBytes)} / {formatBytes(stats.memTotalBytes)}
							</span>
							<span class="sysmon-mem-pct hidden tabular-nums">{memPercent.toFixed(0)}%</span>
						</div>
						<div
							class="h-1.5 w-full overflow-hidden rounded-full bg-[var(--ag-surface-3)]"
							role="progressbar"
							aria-valuenow={memPercent}
							aria-valuemin="0"
							aria-valuemax="100"
						>
							<div
								class="h-full rounded-full bg-[var(--ag-accent)]"
								style="width: {memPercent.toFixed(1)}%"
							></div>
						</div>
					</div>
				{/if}
				{#if showDisk && disks.length > 0}
					<div class="space-y-1 border-t border-[var(--ag-border)] pt-1">
						<span class="text-[var(--ag-text-muted)]">ディスク</span>
						{#each disks as d (d.mount)}
							{@const pct = d.totalBytes > 0 ? (d.usedBytes / d.totalBytes) * 100 : 0}
							<div class="space-y-0.5">
								<div class="flex items-baseline justify-between gap-2">
									<span class="min-w-0 flex-1 truncate text-[var(--ag-text-primary)]"
										>{d.mount}</span
									>
									<span
										class="shrink-0 tabular-nums text-[10px] text-[var(--ag-text-muted)]"
										>{pct.toFixed(0)}%</span
									>
								</div>
								<div
									class="h-1 w-full overflow-hidden rounded-full bg-[var(--ag-surface-3)]"
									role="progressbar"
									aria-valuenow={pct}
									aria-valuemin="0"
									aria-valuemax="100"
								>
									<div
										class="h-full rounded-full bg-[var(--ag-accent)]"
										style="width: {pct.toFixed(1)}%"
									></div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => (settingsOpen = false)} />
{/if}

<style>
.sysmon-container {
	container-type: inline-size;
}

/*
	PH-507: S サイズ (< 200px) で:
	- sparkline (svg) 非表示 (狭い widget で gauge 圧縮)
	- メモリ詳細 (used/total bytes) → percent only に短縮
*/
@container (max-width: 200px) {
	.sysmon-sparkline {
		display: none;
	}
	.sysmon-mem-detail {
		display: none;
	}
	.sysmon-mem-pct {
		display: inline !important;
	}
}
</style>
