<script lang="ts">
import { Activity } from '@lucide/svelte';
import { invoke } from '@tauri-apps/api/core';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';
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

async function refresh() {
	try {
		const s = await invoke<SystemStats>('cmd_get_system_stats');
		stats = s;
		cpuHistory = pushBuffer(cpuHistory, s.cpuPercent, 60);
	} catch {
		// 一時失敗は静かに無視
	}
	if (showDisk) {
		try {
			disks = await invoke<DiskStats[]>('cmd_get_disk_stats');
		} catch {
			// disk 取得失敗は無視
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
	{#if !stats}
		<p class="text-xs text-[var(--ag-text-muted)]">取得中...</p>
	{:else}
		<div class="space-y-2 text-xs">
			{#if showCpu}
				<div class="space-y-0.5">
					<div class="flex items-baseline justify-between text-[var(--ag-text-primary)]">
						<span class="text-[var(--ag-text-muted)]">CPU</span>
						<span class="tabular-nums">{stats.cpuPercent.toFixed(1)}%</span>
					</div>
					<svg viewBox="0 0 100 20" preserveAspectRatio="none" class="h-5 w-full" aria-hidden="true">
						<path d={sparklinePath} fill="none" stroke="var(--ag-accent)" stroke-width="1.5" vector-effect="non-scaling-stroke" />
					</svg>
				</div>
			{/if}
			{#if showMemory}
				<div class="space-y-0.5">
					<div class="flex items-baseline justify-between text-[var(--ag-text-primary)]">
						<span class="text-[var(--ag-text-muted)]">メモリ</span>
						<span class="tabular-nums">
							{formatBytes(stats.memUsedBytes)} / {formatBytes(stats.memTotalBytes)}
						</span>
					</div>
					<div class="h-1.5 w-full overflow-hidden rounded-full bg-[var(--ag-surface-3)]" role="progressbar" aria-valuenow={memPercent} aria-valuemin="0" aria-valuemax="100">
						<div class="h-full rounded-full bg-[var(--ag-accent)]" style="width: {memPercent.toFixed(1)}%"></div>
					</div>
				</div>
			{/if}
			{#if showDisk && disks.length > 0}
				<div class="space-y-1 border-t border-[var(--ag-border)] pt-1">
					<span class="text-[var(--ag-text-muted)]">ディスク</span>
					{#each disks as d (d.mount)}
						{@const pct = d.totalBytes > 0 ? (d.usedBytes / d.totalBytes) * 100 : 0}
						<div class="space-y-0.5">
							<div class="flex items-baseline justify-between">
								<span class="truncate text-[var(--ag-text-primary)]">{d.mount}</span>
								<span class="shrink-0 tabular-nums text-[10px] text-[var(--ag-text-muted)]">{pct.toFixed(0)}%</span>
							</div>
							<div class="h-1 w-full overflow-hidden rounded-full bg-[var(--ag-surface-3)]" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100">
								<div class="h-full rounded-full bg-[var(--ag-accent)]" style="width: {pct.toFixed(1)}%"></div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => (settingsOpen = false)} />
{/if}
