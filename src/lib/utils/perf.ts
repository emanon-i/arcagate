/**
 * Performance instrumentation utilities for Library hot path 計測。
 *
 * user 実環境で freeze の真因特定するための instrumentation。dev mode で常時 capture、
 * release は flag で off。
 *
 * 主要 API:
 * - `markStart(label)` / `markEnd(label)`: performance.mark + measure pair
 * - `wrapIpc(cmd, fn)`: 高階関数で IPC レイテンシ自動計測
 * - `installLongtaskObserver()`: PerformanceObserver で longtask 自動 console.warn
 * - `dumpReport()`: 累積計測の summary を console.table / JSON 出力
 *
 * 使い方:
 * ```ts
 * import { markStart, markEnd, wrapIpc, installLongtaskObserver } from '$lib/utils/perf';
 *
 * // mount 時
 * installLongtaskObserver();
 *
 * // hot path
 * markStart('library:view-mount');
 * // ... mount work
 * markEnd('library:view-mount');
 *
 * // IPC wrap
 * const items = await wrapIpc('list_items', () => invoke('cmd_list_items'));
 * ```
 */

const PERF_ENABLED =
	typeof window !== 'undefined' && (import.meta.env?.DEV ?? false) && 'performance' in window;

const LONGTASK_THRESHOLD_MS = 50;
const IPC_WARN_THRESHOLD_MS = 100;

interface IpcStat {
	count: number;
	totalMs: number;
	maxMs: number;
}

const ipcStats = new Map<string, IpcStat>();
const markStarts = new Map<string, number>();

function recordIpc(cmd: string, dur: number): void {
	const cur = ipcStats.get(cmd) ?? { count: 0, totalMs: 0, maxMs: 0 };
	cur.count += 1;
	cur.totalMs += dur;
	cur.maxMs = Math.max(cur.maxMs, dur);
	ipcStats.set(cmd, cur);
	if (dur > IPC_WARN_THRESHOLD_MS) {
		console.warn(`[perf] IPC slow: ${cmd} = ${dur.toFixed(1)}ms`);
	}
}

/**
 * performance.mark の開始 (label に prefix `arcagate:` 付与)。
 */
export function markStart(label: string): void {
	if (!PERF_ENABLED) return;
	const name = `arcagate:${label}`;
	performance.mark(`${name}:start`);
	markStarts.set(name, performance.now());
}

/**
 * performance.measure で開始からの経過時間を記録。
 */
export function markEnd(label: string): number | null {
	if (!PERF_ENABLED) return null;
	const name = `arcagate:${label}`;
	const start = markStarts.get(name);
	if (start === undefined) return null;
	const dur = performance.now() - start;
	try {
		performance.mark(`${name}:end`);
		performance.measure(name, `${name}:start`, `${name}:end`);
	} catch {
		// safari / safari preview で measure が稀に throw
	}
	markStarts.delete(name);
	return dur;
}

/**
 * IPC 呼び出しを wrap してレイテンシ計測。slow IPC (>100ms) は自動 warn。
 *
 * 使い方:
 * ```ts
 * const result = await wrapIpc('search_items', () => invoke('cmd_search_items', { query }));
 * ```
 */
export async function wrapIpc<T>(cmd: string, fn: () => Promise<T>): Promise<T> {
	if (!PERF_ENABLED) return fn();
	const t0 = performance.now();
	try {
		return await fn();
	} finally {
		const dur = performance.now() - t0;
		recordIpc(cmd, dur);
	}
}

/**
 * PerformanceObserver で longtask 自動検知 + console.warn。
 * idempotent (重複登録 safe)、+layout.svelte mount で 1 回呼ぶ前提。
 */
let longtaskObserver: PerformanceObserver | null = null;
const longtaskRecords: { dur: number; ts: number; name: string }[] = [];

export function installLongtaskObserver(): void {
	if (!PERF_ENABLED) return;
	if (longtaskObserver) return; // idempotent
	if (typeof PerformanceObserver === 'undefined') return;
	try {
		longtaskObserver = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				if (entry.duration < LONGTASK_THRESHOLD_MS) continue;
				longtaskRecords.push({
					dur: entry.duration,
					ts: entry.startTime,
					name: entry.name,
				});
				console.warn(
					`[perf] longtask: ${entry.duration.toFixed(1)}ms ${entry.name} @${entry.startTime.toFixed(0)}ms`,
				);
			}
		});
		longtaskObserver.observe({ entryTypes: ['longtask'] });
	} catch (e) {
		console.warn('[perf] longtask observer install failed', e);
	}
}

/**
 * 累積計測 summary を console.table で表示 + JSON 返却。
 * dev mode の手動診断用 (e.g., DevTools console から `arcagate.perf.dump()` で実行)。
 */
export function dumpReport(): {
	ipcStats: Record<string, IpcStat>;
	longtasks: typeof longtaskRecords;
	slowResources: typeof slowResources;
} {
	if (!PERF_ENABLED) {
		console.log('[perf] disabled (release build or no window)');
		return { ipcStats: {}, longtasks: [], slowResources: [] };
	}
	const ipcEntries = [...ipcStats.entries()]
		.sort((a, b) => b[1].totalMs - a[1].totalMs)
		.map(([cmd, s]) => ({
			cmd,
			count: s.count,
			totalMs: Number(s.totalMs.toFixed(1)),
			avgMs: Number((s.totalMs / s.count).toFixed(2)),
			maxMs: Number(s.maxMs.toFixed(1)),
		}));
	console.group('[perf] IPC stats (sorted by total dur)');
	console.table(ipcEntries);
	console.groupEnd();

	console.group('[perf] longtask records');
	console.table(longtaskRecords.map((r) => ({ ...r, dur: r.dur.toFixed(1) })));
	console.groupEnd();

	console.group(`[perf] slow resources (>100ms、計 ${slowResources.length} 件)`);
	console.table(slowResources.slice(0, 20).map((r) => ({ ...r, dur: r.dur.toFixed(1) })));
	console.groupEnd();

	return {
		ipcStats: Object.fromEntries(ipcStats),
		longtasks: longtaskRecords,
		slowResources,
	};
}

/**
 * Library 系の標準 mark labels (typo 防止のため定数化)。
 */
export const PERF_LABELS = {
	libraryViewMount: 'library:view-mount',
	libraryCardMount: 'library:card-mount',
	librarySearch: 'library:search',
	libraryFilteredItemsCompute: 'library:filtered-compute',
	libraryMetadataWarmup: 'library:metadata-warmup',
	libraryStarredFetch: 'library:starred-fetch',
} as const;

/**
 * Resource timing observer で全 image / IPC fetch の load 時間を自動 capture。
 * idempotent。`installLongtaskObserver` と同様 +layout.svelte mount で 1 回呼ぶ。
 */
let resourceObserver: PerformanceObserver | null = null;
const slowResources: { url: string; dur: number; type: string }[] = [];

export function installResourceObserver(): void {
	if (!PERF_ENABLED) return;
	if (resourceObserver) return;
	if (typeof PerformanceObserver === 'undefined') return;
	try {
		resourceObserver = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				const r = entry as PerformanceResourceTiming;
				// Tauri 内 image / asset / IPC 系を主に。長 (>100ms) のみ記録。
				if (r.duration < 100) continue;
				slowResources.push({
					url: r.name.length > 100 ? r.name.slice(0, 97) + '...' : r.name,
					dur: r.duration,
					type: r.initiatorType,
				});
				if (r.duration > 200) {
					console.warn(
						`[perf] slow resource: ${r.duration.toFixed(1)}ms ${r.initiatorType} ${r.name.slice(0, 80)}`,
					);
				}
			}
		});
		resourceObserver.observe({ entryTypes: ['resource'] });
	} catch (e) {
		console.warn('[perf] resource observer install failed', e);
	}
}

// dev mode で window.__arcagate__.perf に expose (DevTools console から手動 dump 用)
if (PERF_ENABLED) {
	const w = window as unknown as { __arcagate__?: { perf?: unknown } };
	w.__arcagate__ = w.__arcagate__ ?? {};
	w.__arcagate__.perf = {
		dump: dumpReport,
		ipcStats,
		longtaskRecords,
		slowResources,
	};
}
