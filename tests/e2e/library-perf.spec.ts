import { copyFileSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '../fixtures/tauri';
import { bulkDeleteItems, createItem, listItems, updateItem } from '../helpers/ipc';

/**
 * Library 画面 117 item perf 計測 spec。
 *
 * user 報告: 「117 item 追加後 Library に行くと 20 秒応答なし」。
 *
 * 計測対象:
 *  1. cmd_get_items_metadata_batch(117) の所要時間 + ping latency (= backend block)
 *  2. Workspace -> Library 遷移の wall time (card / icon)
 *  3. asset:// (icon) resource timing — count / total / max
 *  4. frontend longtask total
 *
 * このファイルは CI の `pnpm verify` 経路 (vitest) には入らない。
 * `pnpm test:e2e` (user 許可制) でのみ実行される計測 spec。
 */

const FIXTURE_ROOT = join(process.cwd(), 'tmp', `perf-fixture-${Date.now()}`);
// 実 app と同じ asset scope ($APPDATA/icons/**) に icon を置く必要がある。
const APPDATA = process.env.APPDATA ?? join(process.env.USERPROFILE ?? '.', 'AppData', 'Roaming');
const ICON_DIR = join(APPDATA, 'com.arcagate.desktop', 'icons');
const ICON_PREFIX = 'perf-icon-';
const BIG_DIRS = 4;
const FILES_PER_DIR = 4000;
const ITEM_COUNT = 117;

function buildFolderFixture(): string[] {
	const dirs: string[] = [];
	for (let d = 0; d < BIG_DIRS; d++) {
		const dir = join(FIXTURE_ROOT, `bigdir-${d}`);
		mkdirSync(dir, { recursive: true });
		for (let f = 0; f < FILES_PER_DIR; f++) {
			writeFileSync(join(dir, `f-${f}.bin`), 'x');
		}
		dirs.push(dir);
	}
	return dirs;
}

/** 117 個の distinct PNG を $APPDATA/icons に作る (実 exe icon を模す、各 11KB)。 */
function buildIconFixture(): string[] {
	mkdirSync(ICON_DIR, { recursive: true });
	const srcPng = join(process.cwd(), 'src-tauri', 'icons', '128x128.png');
	const paths: string[] = [];
	for (let i = 0; i < ITEM_COUNT; i++) {
		const p = join(ICON_DIR, `${ICON_PREFIX}${String(i).padStart(3, '0')}.png`);
		copyFileSync(srcPng, p);
		paths.push(p);
	}
	return paths;
}

function cleanupIcons(): void {
	try {
		for (const f of readdirSync(ICON_DIR)) {
			if (f.startsWith(ICON_PREFIX)) rmSync(join(ICON_DIR, f), { force: true });
		}
	} catch {
		// ディレクトリ無しは無視
	}
}

test('Library 117 item perf 計測', async ({ page }) => {
	test.setTimeout(240_000);

	const bigDirs = buildFolderFixture();
	const iconPaths = buildIconFixture();
	const exeTarget = join(process.cwd(), 'src-tauri', 'target', 'debug', 'arcagate.exe');

	// --- 既存 item を一掃 ---
	const existing = await listItems(page);
	if (existing.length > 0) {
		await bulkDeleteItems(
			page,
			existing.map((i) => i.id),
		);
	}

	// --- 117 item seed: folder 60 / url 32 / exe 25、全 item に icon_path ---
	for (let i = 0; i < ITEM_COUNT; i++) {
		let item_type: string;
		let target: string;
		if (i < 60) {
			item_type = 'folder';
			target = bigDirs[i % bigDirs.length];
		} else if (i < 92) {
			item_type = 'url';
			target = `https://example-${i}.com/path`;
		} else {
			item_type = 'exe';
			target = exeTarget;
		}
		const created = await createItem(page, {
			item_type,
			label: `perf-item-${String(i).padStart(3, '0')}`,
			target,
			aliases: [],
			tag_ids: [],
		});
		await updateItem(page, created.id, { icon_path: iconPaths[i] });
	}

	const seeded = await listItems(page);
	expect(seeded.length).toBe(ITEM_COUNT);
	const ids = seeded.map((i) => i.id);

	// --- itemStore を最新化 (reload で +page.svelte init effect が再 fetch) ---
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });

	// --- 計測 1: 重い command の所要時間 + 実行中の ping latency ---
	const probe = await page.evaluate(async (allIds) => {
		const invoke = (
			window as unknown as {
				__TAURI_INTERNALS__: {
					invoke<T>(c: string, a?: Record<string, unknown>): Promise<T>;
				};
			}
		).__TAURI_INTERNALS__.invoke;

		const l0 = performance.now();
		await invoke('cmd_list_items');
		const listMs = performance.now() - l0;

		const t0 = performance.now();
		const heavy = invoke('cmd_get_items_metadata_batch', { ids: allIds });
		const pings: number[] = [];
		for (let i = 0; i < 15; i++) {
			const p0 = performance.now();
			await invoke('cmd_get_library_stats');
			pings.push(performance.now() - p0);
		}
		await heavy;
		const heavyMs = performance.now() - t0;
		return { listMs, heavyMs, maxPingMs: Math.max(...pings) };
	}, ids);

	// --- Workspace タブへ (icon が cache されないよう Library を描画させない) ---
	await page.getByRole('button', { name: 'Workspace', exact: true }).first().click();
	await page.waitForTimeout(800);

	// observer 仕込み (longtask + asset:// resource timing)。
	// asset は完了時刻 (perf.now) も記録し、 nav epoch からの相対で初期 icon 完了を出す。
	await page.evaluate(() => {
		const w = window as unknown as {
			__perf__: {
				longtask: number;
				longCount: number;
				assets: number[];
				assetEnds: number[];
				navEpoch: number;
			};
		};
		w.__perf__ = { longtask: 0, longCount: 0, assets: [], assetEnds: [], navEpoch: 0 };
		new PerformanceObserver((list) => {
			for (const e of list.getEntries()) {
				w.__perf__.longtask += e.duration;
				w.__perf__.longCount += 1;
			}
		}).observe({ entryTypes: ['longtask'] });
		new PerformanceObserver((list) => {
			for (const e of list.getEntries()) {
				if (e.name.includes('asset.localhost')) {
					w.__perf__.assets.push(e.duration);
					w.__perf__.assetEnds.push(performance.now());
				}
			}
		}).observe({ entryTypes: ['resource'] });
	});

	// --- 計測 2: Workspace -> Library 遷移 (初期描画、 スクロール無し) ---
	await page.evaluate(() => {
		(window as unknown as { __perf__: { navEpoch: number } }).__perf__.navEpoch = performance.now();
	});
	const navStart = Date.now();
	await page.getByRole('button', { name: 'Library', exact: true }).first().click();
	await page
		.locator('[data-testid^="library-card-"]')
		.first()
		.waitFor({ state: 'visible', timeout: 60_000 });
	await expect
		.poll(() => page.locator('[data-testid^="library-card-"]').count(), { timeout: 60_000 })
		.toBe(ITEM_COUNT);
	const cardsWallMs = Date.now() - navStart;

	// 初期描画 (スクロール無し) の icon request が落ち着くまで待つ。
	// asset:// 完了数が 600ms 増えなくなったら settle と判定。
	const initial = await page.evaluate(async () => {
		const w = window as unknown as {
			__perf__: { assets: number[]; assetEnds: number[]; navEpoch: number };
		};
		let last = -1;
		let stable = 0;
		while (stable < 600) {
			await new Promise((r) => setTimeout(r, 100));
			if (w.__perf__.assets.length === last) stable += 100;
			else {
				stable = 0;
				last = w.__perf__.assets.length;
			}
		}
		const ends = w.__perf__.assetEnds;
		// nav epoch から見た「最後の初期 icon が完了した時刻」 (settle 待ち時間を除外)
		const lastDone = ends.length ? Math.max(...ends) - w.__perf__.navEpoch : 0;
		return { count: w.__perf__.assets.length, lastDoneMs: lastDone };
	});
	const initialAssetCount = initial.count;
	const initialIconDoneMs = initial.lastDoneMs;

	// 全 card の icon を読み込ませるため main をゆっくり最下部までスクロール
	const scrollStart = Date.now();
	await page.evaluate(async () => {
		const el = document.querySelector('[data-testid="library-main-wrapper"]');
		if (!el) return;
		const step = 400;
		for (let y = 0; y <= el.scrollHeight; y += step) {
			el.scrollTop = y;
			await new Promise((r) => setTimeout(r, 60));
		}
		el.scrollTop = el.scrollHeight;
		await new Promise((r) => setTimeout(r, 400));
	});
	await page
		.waitForFunction(
			() => {
				const imgs = [...document.querySelectorAll('[data-testid^="library-card-"] img')];
				return imgs.length > 0 && imgs.every((i) => (i as HTMLImageElement).complete);
			},
			{ timeout: 60_000 },
		)
		.catch(() => {});
	const scrollIconWallMs = Date.now() - scrollStart;
	const totalWallMs = Date.now() - navStart;

	const perf = await page.evaluate(() => {
		const w = window as unknown as {
			__perf__: { longtask: number; longCount: number; assets: number[] };
		};
		const a = w.__perf__.assets;
		return {
			longtask: w.__perf__.longtask,
			longCount: w.__perf__.longCount,
			assetCount: a.length,
			assetTotal: a.reduce((s, v) => s + v, 0),
			assetMax: a.length ? Math.max(...a) : 0,
		};
	});

	console.log('\n========== Library 117 item perf 計測結果 ==========');
	console.table({
		'cmd_list_items (ms)': probe.listMs.toFixed(1),
		'cmd_get_items_metadata_batch x117 (ms)': probe.heavyMs.toFixed(1),
		'ping max latency during heavy (ms)': probe.maxPingMs.toFixed(1),
		'Workspace->Library: 117 card DOM (ms)': cardsWallMs,
		'初期 icon 完了 wall (ms)': initialIconDoneMs.toFixed(0),
		'初期描画 icon request 数': initialAssetCount,
		'scroll + 全 icon complete (ms)': scrollIconWallMs,
		'total wall (全 icon, ms)': totalWallMs,
		'asset:// request total count': perf.assetCount,
		'asset:// total dur (ms)': perf.assetTotal.toFixed(1),
		'asset:// max dur (ms)': perf.assetMax.toFixed(1),
		'frontend longtask total (ms)': perf.longtask.toFixed(1),
		'frontend longtask count': perf.longCount,
	});
	console.log('====================================================\n');

	// --- 計測 3: 各テーマで Workspace -> Library 遷移 (テーマ依存差の確認) ---
	// icon は既に cache 済のため、 ここで測るのは「テーマ CSS の描画コスト」。
	const THEMES = ['dark', 'light', 'neumorph', 'brutalist', 'hud'];
	const themeRows: Record<string, string> = {};
	for (const theme of THEMES) {
		await page.evaluate(
			(m) =>
				(
					window as unknown as {
						__TAURI_INTERNALS__: { invoke<T>(c: string, a?: Record<string, unknown>): Promise<T> };
					}
				).__TAURI_INTERNALS__.invoke('cmd_set_active_theme_mode', { mode: m }),
			theme,
		);
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });
		await page.getByRole('button', { name: 'Workspace', exact: true }).first().click();
		await page.waitForTimeout(500);
		await page.evaluate(() => {
			const w = window as unknown as { __lt__: number };
			w.__lt__ = 0;
			new PerformanceObserver((list) => {
				for (const e of list.getEntries()) w.__lt__ += e.duration;
			}).observe({ entryTypes: ['longtask'] });
		});
		const t0 = Date.now();
		await page.getByRole('button', { name: 'Library', exact: true }).first().click();
		await expect
			.poll(() => page.locator('[data-testid^="library-card-"]').count(), { timeout: 60_000 })
			.toBe(ITEM_COUNT);
		const wall = Date.now() - t0;
		await page.waitForTimeout(800);
		const lt = await page.evaluate(() => (window as unknown as { __lt__: number }).__lt__);
		themeRows[theme] = `card DOM ${wall}ms / longtask ${lt.toFixed(0)}ms`;
	}
	console.log('\n========== テーマ別 Workspace->Library (icon cache 済) ==========');
	console.table(themeRows);
	console.log('==============================================================\n');

	// --- cleanup ---
	await page.evaluate(() =>
		(
			window as unknown as {
				__TAURI_INTERNALS__: { invoke<T>(c: string, a?: Record<string, unknown>): Promise<T> };
			}
		).__TAURI_INTERNALS__.invoke('cmd_set_active_theme_mode', { mode: 'dark' }),
	);
	await bulkDeleteItems(page, ids);
	rmSync(FIXTURE_ROOT, { recursive: true, force: true });
	cleanupIcons();
});
