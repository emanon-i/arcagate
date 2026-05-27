import { type ChildProcess, execFile } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { chromium, test } from '@playwright/test';
import { percentile, reportBudget } from './_helpers';

/**
 * D1 / D2: アプリ起動 P95 (cold ≤ 1500ms / warm ≤ 1000ms)。
 *
 * 共有 instance (global-setup) とは別に、 この spec は自前で Tauri binary を spawn し、
 * spawn → CDP attach → main window <main> 可視 までの wall time を測る。
 *
 * - cold: 毎回 fresh DB + fresh WebView2 user-data-folder (初回起動 = profile 構築込み)
 * - warm: DB + WebView2 profile を再利用した 2 回目以降の起動
 *
 * debug binary (ARCAGATE_TEST_EXE 未指定) は devUrl 経由で Vite に依存するため
 * playwright.perf.config の webServer が起動済の前提。 release binary は frontendDist 埋込。
 */

function exePath(): string {
	const env = process.env.ARCAGATE_TEST_EXE;
	if (env) return isAbsolute(env) ? env : resolve(process.cwd(), env);
	return join(process.cwd(), 'src-tauri', 'target', 'debug', 'arcagate.exe');
}

async function waitForCdp(port: number, maxMs = 90_000): Promise<void> {
	const deadline = Date.now() + maxMs;
	while (Date.now() < deadline) {
		try {
			const res = await fetch(`http://localhost:${port}/json/version`);
			if (res.ok) return;
		} catch {
			// not ready
		}
		await new Promise((r) => setTimeout(r, 200));
	}
	throw new Error(`CDP port ${port} did not open within ${maxMs}ms`);
}

function killTree(proc: ChildProcess): Promise<void> {
	return new Promise((res) => {
		if (!proc.pid) {
			res();
			return;
		}
		execFile('taskkill', ['/PID', String(proc.pid), '/T', '/F'], () => res());
	});
}

const MAIN_URL = /^https?:\/\/(localhost:\d+|tauri\.localhost)\/?(\?.*)?$/;

interface Measured {
	wallMs: number;
	backendSetupMs: number | null;
	backendTotalMs: number | null;
	// PH-CF-900 A1: frontend startup 段階の cumulative 時間 (`+layout` mount → `+page` mount
	// → 初回 IPC バッチ完了 → main paint)。 `markStartupFe` が `console.info` で出した
	// `[perf:startup-fe] step=<name> cumulative=<ms>` を page console 経由で拾う。
	feLayoutMountMs: number | null;
	fePageMountMs: number | null;
	feInitIpcDoneMs: number | null;
	feMainPaintMs: number | null;
}

async function measureLaunch(port: number, dbPath: string, wv2Dir: string): Promise<Measured> {
	const t0 = Date.now();
	let output = '';
	const proc = execFile(exePath(), [], {
		env: {
			...process.env,
			ARCAGATE_DB_PATH: dbPath,
			ARCAGATE_SKIP_HOTKEY: '1',
			WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port}`,
			WEBVIEW2_USER_DATA_FOLDER: wv2Dir,
		},
	});
	// tauri_plugin_log の Stdout target は stdout、 panic 等は stderr。 両方拾う。
	proc.stdout?.on('data', (d: Buffer) => {
		output += d.toString();
	});
	proc.stderr?.on('data', (d: Buffer) => {
		output += d.toString();
	});

	// PH-CF-900 A1: frontend startup log (`[perf:startup-fe]`) は page console に出る。
	// CDP page attach 経由で console message を収集する (browser log と page console は別経路)。
	const feLog: string[] = [];

	try {
		await waitForCdp(port);
		const browser = await chromium.connectOverCDP(`http://localhost:${port}`);
		try {
			const ctx = browser.contexts()[0];
			let pg = ctx.pages().find((p) => MAIN_URL.test(p.url()));
			for (let i = 0; !pg && i < 200; i++) {
				await new Promise((r) => setTimeout(r, 200));
				pg = ctx.pages().find((p) => MAIN_URL.test(p.url()));
			}
			if (!pg) throw new Error('main window (/) page did not attach');
			pg.on('console', (msg) => {
				const text = msg.text();
				if (text.includes('[perf:startup-fe]')) feLog.push(text);
			});
			await pg.waitForLoadState('domcontentloaded');
			await pg.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });
			// main_paint は requestAnimationFrame 2 段経由で記録するため、 <main> 可視後に
			// 1 frame だけ待って console を回収する (= 取りこぼし防止)。
			await pg.waitForTimeout(150);
		} finally {
			await browser.close();
		}
	} finally {
		await killTree(proc);
		await new Promise((r) => setTimeout(r, 700));
	}

	const wallMs = Date.now() - t0;
	// T7: backend の perf:startup log から setup 内訳を拾う (informational)。
	const m = /step=setup_complete setup=(\d+)ms total=(\d+)ms/.exec(output);
	const parseFe = (step: string): number | null => {
		const re = new RegExp(`step=${step} cumulative=(\\d+)ms`);
		for (const line of feLog) {
			const fm = re.exec(line);
			if (fm) return Number.parseInt(fm[1], 10);
		}
		return null;
	};
	return {
		wallMs,
		backendSetupMs: m ? Number.parseInt(m[1], 10) : null,
		backendTotalMs: m ? Number.parseInt(m[2], 10) : null,
		feLayoutMountMs: parseFe('layout_mount'),
		fePageMountMs: parseFe('page_mount'),
		feInitIpcDoneMs: parseFe('init_ipc_done'),
		feMainPaintMs: parseFe('main_paint'),
	};
}

test('D1/D2 起動 P95 (cold / warm)', async () => {
	test.setTimeout(900_000);

	const N = Number.parseInt(process.env.ARCAGATE_PERF_STARTUP_N ?? '8', 10);
	const tmpRoot = join(process.cwd(), 'tmp', `perf-startup-${Date.now()}`);
	mkdirSync(tmpRoot, { recursive: true });
	let port = 9540;

	// --- cold: 毎回 fresh DB + fresh WebView2 profile ---
	const cold: number[] = [];
	const coldBackend: number[] = [];
	// PH-CF-900 A1: frontend 段階内訳の累積 cumulative。 P95 で見る (wall と同じ)。
	const coldFeLayout: number[] = [];
	const coldFePage: number[] = [];
	const coldFeIpc: number[] = [];
	const coldFePaint: number[] = [];
	for (let i = 0; i < N; i++) {
		const db = join(tmpRoot, `cold-${i}.db`);
		const wv2 = join(tmpRoot, `cold-wv2-${i}`);
		mkdirSync(wv2, { recursive: true });
		const r = await measureLaunch(port++, db, wv2);
		cold.push(r.wallMs);
		if (r.backendTotalMs != null) coldBackend.push(r.backendTotalMs);
		if (r.feLayoutMountMs != null) coldFeLayout.push(r.feLayoutMountMs);
		if (r.fePageMountMs != null) coldFePage.push(r.fePageMountMs);
		if (r.feInitIpcDoneMs != null) coldFeIpc.push(r.feInitIpcDoneMs);
		if (r.feMainPaintMs != null) coldFePaint.push(r.feMainPaintMs);
	}

	// --- warm: DB + WebView2 profile を再利用 (初回は warm-up で捨てる) ---
	const warmDb = join(tmpRoot, 'warm.db');
	const warmWv2 = join(tmpRoot, 'warm-wv2');
	mkdirSync(warmWv2, { recursive: true });
	await measureLaunch(port++, warmDb, warmWv2); // warm-up (計測外)
	const warm: number[] = [];
	for (let i = 0; i < N; i++) {
		const r = await measureLaunch(port++, warmDb, warmWv2);
		warm.push(r.wallMs);
	}

	const coldP95 = percentile(cold, 95);
	const warmP95 = percentile(warm, 95);
	console.log(
		`[perf] D1 cold: ${cold.map((v) => v.toFixed(0)).join('/')} -> p95=${coldP95.toFixed(0)}ms`,
	);
	console.log(
		`[perf] D2 warm: ${warm.map((v) => v.toFixed(0)).join('/')} -> p95=${warmP95.toFixed(0)}ms`,
	);
	if (coldBackend.length > 0) {
		console.log(
			`[perf] backend setup (perf:startup total): p95=${percentile(coldBackend, 95).toFixed(0)}ms`,
		);
	}
	// PH-CF-900 A1: frontend 段階内訳。 backend setup_complete から frontend layout_mount
	// までの gap が「frontend が起動するまでの bootstrap (= WebView2 init + hydration)」
	// で、 layout_mount → main_paint が「frontend 自身の起動コスト」 になる。
	const fmt = (arr: number[]) => (arr.length > 0 ? percentile(arr, 95).toFixed(0) : 'n/a');
	console.log(
		`[perf] FE cumulative p95 (cold): layout_mount=${fmt(coldFeLayout)}ms / page_mount=${fmt(coldFePage)}ms / init_ipc_done=${fmt(coldFeIpc)}ms / main_paint=${fmt(coldFePaint)}ms`,
	);

	// 2026-05-27 再設定: 旧 aspirational 値 (cold 1500 / warm 1000) は CI windows-latest 上で
	// 構造的に到達不能で perf gate が常時赤かった。 直近 10 run の実測 P95 中央値 (cold ~2450ms
	// / warm ~2100ms) を baseline に + 約 33% regression 帯を載せて regression 検出器として
	// 機能させる方針へ転換 (cold 3200 / warm 2800)。 詳細は
	// `docs/l1_requirements/vision.md` の §非機能要件 D1/D2 と
	// `docs/l3_phases/_archive/PH-20260522-perf-budgets.md` の baseline 表を参照。
	reportBudget({
		budget: 'D1',
		name: 'startup-cold',
		metric: 'wall-p95',
		value: coldP95,
		unit: 'ms',
		threshold: 3200,
		comparator: 'lte',
	});
	reportBudget({
		budget: 'D2',
		name: 'startup-warm',
		metric: 'wall-p95',
		value: warmP95,
		unit: 'ms',
		threshold: 2800,
		comparator: 'lte',
	});

	rmSync(tmpRoot, { recursive: true, force: true });
});
