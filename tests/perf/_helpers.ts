import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { expect, type Page } from '@playwright/test';

/**
 * PH-PQ-400 T1: 性能予算 (vision.md D1-D9) を CI gate 化するための共通計測ヘルパー。
 *
 * 各 perf spec は計測 → recordResult() で tmp/perf/results.json に追記 → assertBudget()
 * で閾値判定する。 ARCAGATE_PERF_SOFT=1 のとき閾値超過を fail させず warning ログのみ
 * (debug build / ローカル観測用)。 CI (perf.yml) は soft 無しで hard gate。
 */

const execFileAsync = promisify(execFile);

export const PERF_OUT_DIR = join(process.cwd(), 'tmp', 'perf');
export const RESULTS_PATH = join(PERF_OUT_DIR, 'results.json');

/** debug build / ローカル観測時は閾値超過を fail させない。 CI release gate は未設定 = hard。 */
export const SOFT = process.env.ARCAGATE_PERF_SOFT === '1';

/** P95 等の percentile (1..100)。 空配列は 0。 */
export function percentile(values: number[], p: number): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const idx = Math.ceil((p / 100) * sorted.length) - 1;
	return sorted[Math.min(sorted.length - 1, Math.max(0, idx))];
}

export interface PerfResult {
	budget: string; // D1..D9
	name: string;
	metric: string;
	value: number;
	unit: string;
	threshold: number;
	comparator: 'lte' | 'gte';
	passed: boolean;
	soft: boolean;
	measuredAt: string;
}

/** 計測値を results.json に upsert (budget+name+metric を key に重複排除)。 */
export function recordResult(r: Omit<PerfResult, 'passed' | 'soft' | 'measuredAt'>): PerfResult {
	const passed = r.comparator === 'lte' ? r.value <= r.threshold : r.value >= r.threshold;
	const full: PerfResult = { ...r, passed, soft: SOFT, measuredAt: new Date().toISOString() };
	mkdirSync(PERF_OUT_DIR, { recursive: true });
	let all: PerfResult[] = [];
	if (existsSync(RESULTS_PATH)) {
		try {
			all = JSON.parse(readFileSync(RESULTS_PATH, 'utf8')) as PerfResult[];
		} catch {
			all = [];
		}
	}
	all = all.filter(
		(x) => !(x.budget === full.budget && x.name === full.name && x.metric === full.metric),
	);
	all.push(full);
	writeFileSync(RESULTS_PATH, JSON.stringify(all, null, 2));
	return full;
}

/** 計測結果を 1 行 log し、 SOFT でなければ閾値超過で fail させる。 */
export function assertBudget(r: PerfResult): void {
	const cmp = r.comparator === 'lte' ? '<=' : '>=';
	const line =
		`[perf] ${r.budget} ${r.name} :: ${r.metric}=${r.value.toFixed(1)}${r.unit} ` +
		`(budget ${cmp} ${r.threshold}${r.unit}) -> ${r.passed ? 'PASS' : 'FAIL'}`;
	console.log(line);
	if (!r.passed && !SOFT) {
		expect(r.passed, line).toBe(true);
	}
}

/** 計測 + 記録 + 判定をまとめて行う。 */
export function reportBudget(r: Omit<PerfResult, 'passed' | 'soft' | 'measuredAt'>): void {
	assertBudget(recordResult(r));
}

/** page context の Tauri invoke を呼ぶ薄い wrapper。 */
export async function pageInvoke<T>(
	page: Page,
	cmd: string,
	args: Record<string, unknown> = {},
): Promise<T> {
	return page.evaluate(
		([c, a]) =>
			(
				window as unknown as {
					__TAURI_INTERNALS__: { invoke<R>(c: string, a?: Record<string, unknown>): Promise<R> };
				}
			).__TAURI_INTERNALS__.invoke(c as string, a as Record<string, unknown>),
		[cmd, args] as const,
	) as Promise<T>;
}

/** asset scope ($APPDATA/com.arcagate.desktop/icons) — perf icon fixture の置き場所。 */
function iconDir(): string {
	const appData = process.env.APPDATA ?? join(process.env.USERPROFILE ?? '.', 'AppData', 'Roaming');
	return join(appData, 'com.arcagate.desktop', 'icons');
}

const ICON_PREFIX = 'perf-scale-icon-';

/** distinct PNG を pool 個作る (各 card の asset:// load を実環境に近づける)。 */
export function buildIconPool(poolSize: number): string[] {
	const dir = iconDir();
	mkdirSync(dir, { recursive: true });
	const srcPng = join(process.cwd(), 'src-tauri', 'icons', '128x128.png');
	const src = readFileSync(srcPng);
	const paths: string[] = [];
	for (let i = 0; i < poolSize; i++) {
		const p = join(dir, `${ICON_PREFIX}${String(i).padStart(4, '0')}.png`);
		// 同一 byte 列だが path が異なれば WebView2 は別 resource として扱う。
		writeFileSync(p, src);
		paths.push(p);
	}
	return paths;
}

/** buildIconPool で作った icon を全削除。 */
export function cleanupIconPool(): void {
	try {
		const dir = iconDir();
		for (const f of readdirSync(dir)) {
			if (f.startsWith(ICON_PREFIX)) {
				rmSync(join(dir, f), { force: true });
			}
		}
	} catch {
		// ディレクトリ無しは無視
	}
}

/**
 * N item を seed する (Library scale fixture)。 createItem を chunk 並列で叩き
 * round-trip latency を畳む。 全 item に icon_path を付与。 返り値は id 配列。
 */
export async function seedItems(page: Page, count: number, iconPaths: string[]): Promise<string[]> {
	const CHUNK = 250;
	const ids: string[] = [];
	for (let start = 0; start < count; start += CHUNK) {
		const end = Math.min(count, start + CHUNK);
		const chunk = await page.evaluate(
			async ({ s, e, icons }) => {
				const invoke = (
					window as unknown as {
						__TAURI_INTERNALS__: {
							invoke<R>(c: string, a?: Record<string, unknown>): Promise<R>;
						};
					}
				).__TAURI_INTERNALS__.invoke;
				const tasks: Promise<string>[] = [];
				for (let i = s; i < e; i++) {
					const input = {
						item_type: 'url',
						label: `perf scale item ${String(i).padStart(5, '0')}`,
						target: `https://perf-${i}.example.com/`,
						icon_path: icons.length > 0 ? icons[i % icons.length] : null,
						aliases: [],
						tag_ids: [],
					};
					tasks.push(invoke<{ id: string }>('cmd_create_item', { input }).then((it) => it.id));
				}
				return Promise.all(tasks);
			},
			{ s: start, e: end, icons: iconPaths },
		);
		ids.push(...chunk);
	}
	return ids;
}

/** 既存 item を全削除 (seed 前のクリーンアップ)。 */
export async function clearAllItems(page: Page): Promise<void> {
	const items = await pageInvoke<{ id: string }[]>(page, 'cmd_list_items');
	if (items.length > 0) {
		await pageInvoke(page, 'cmd_bulk_delete_items', { itemIds: items.map((i) => i.id) });
	}
}

/**
 * scroll コンテナを duration 間スクロールしながら rAF frame を数え fps を出す。
 * longtask 総和も返す (jank 指標)。
 */
export async function measureScrollFps(
	page: Page,
	selector: string,
	durationMs = 2500,
): Promise<{ fps: number; frames: number; longTaskMs: number }> {
	return page.evaluate(
		async ({ sel, dur }) => {
			let el = document.querySelector(sel) as HTMLElement | null;
			// 指定要素が非スクロールなら、 スクロール可能な祖先まで遡る。
			while (el && el.scrollHeight - el.clientHeight < 4 && el.parentElement) {
				el = el.parentElement;
			}
			if (!el || el.scrollHeight - el.clientHeight < 4) {
				el = (document.scrollingElement as HTMLElement | null) ?? document.body;
			}
			if (!el) return { fps: 0, frames: 0, longTaskMs: 0 };
			let frames = 0;
			let running = true;
			let longTaskMs = 0;
			const obs = new PerformanceObserver((list) => {
				for (const ent of list.getEntries()) longTaskMs += ent.duration;
			});
			obs.observe({ entryTypes: ['longtask'] });
			const tick = () => {
				frames++;
				if (running) requestAnimationFrame(tick);
			};
			requestAnimationFrame(tick);
			const start = performance.now();
			const max = Math.max(1, el.scrollHeight - el.clientHeight);
			while (performance.now() - start < dur) {
				const t = (performance.now() - start) / dur;
				el.scrollTop = Math.round(t * max);
				await new Promise((r) => setTimeout(r, 16));
			}
			running = false;
			const elapsed = performance.now() - start;
			obs.disconnect();
			return { fps: (frames / elapsed) * 1000, frames, longTaskMs };
		},
		{ sel: selector, dur: durationMs },
	);
}

/**
 * Windows: pid を root にした process tree の合計 CPU 秒を取る (idle CPU 計測用)。
 * WebView2 は msedgewebview2.exe 子プロセスを複数持つため tree 全体を合算する。
 */
export async function processTreeCpuSeconds(rootPid: number): Promise<number> {
	const ps = `
$ErrorActionPreference='SilentlyContinue'
$root=${rootPid}
$all=Get-CimInstance Win32_Process
$tree=New-Object System.Collections.Generic.HashSet[int]
[void]$tree.Add($root)
$changed=$true
while($changed){
  $changed=$false
  foreach($p in $all){
    if($tree.Contains([int]$p.ParentProcessId) -and -not $tree.Contains([int]$p.ProcessId)){
      [void]$tree.Add([int]$p.ProcessId); $changed=$true
    }
  }
}
$total=0.0
foreach($id in $tree){
  $proc=Get-Process -Id $id -ErrorAction SilentlyContinue
  if($proc){ $total += [double]$proc.CPU }
}
[Console]::WriteLine($total)
`;
	const { stdout } = await execFileAsync(
		'powershell.exe',
		['-NoProfile', '-NonInteractive', '-Command', ps],
		{ windowsHide: true },
	);
	const v = Number.parseFloat(stdout.trim());
	return Number.isFinite(v) ? v : 0;
}

/** 論理 CPU 数 (CPU% 正規化用)。 */
export function logicalCpuCount(): number {
	return Math.max(1, cpus().length);
}
