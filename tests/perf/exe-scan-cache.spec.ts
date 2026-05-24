import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '../fixtures/tauri';
import { invoke } from '../helpers/ipc';

/**
 * PH-CF-900 A1-4: exe scan キャッシュ化の e2e 受け入れ条件。
 *
 * 受け入れ条件 (`docs/l3_phases/clean-feedback/PH-CF-900_startup-perf-exe-cache.md`):
 *  - exe-folder widget の 2 回目以降の mount で scan がキャッシュヒットし cold walk が走らない
 *  - cache key (watch_path + extensions + scan_depth) が変わるとキャッシュが invalidate される
 *
 * 計測方針: 直接 `cmd_scan_exe_folders` を一度走らせ cache を仕込んだあと、 同入力で
 * `cmd_get_exe_scan_cached` が **fresh scan より大幅に速く返る** ことを確認する (cold walk を
 * 走らせないことの間接 verify)。 wall time の絶対値は disk / fixture size に依存するため、
 * 「entries が一致 + cached call が `<= 100ms`」 で判定する。
 *
 * unit (cache key 正規化 / invalidate / collide なし) は `exe_scanner_service::tests` で
 * カバー済のため、 ここでは UI と IPC の round-trip だけ確認する。
 */

const FIXTURE_ROOT = join(process.cwd(), 'tmp', `perf-exe-cache-${Date.now()}`);
const DEFAULT_EXTS = ['exe', 'bat', 'cmd', 'ps1', 'sh'];

function buildFixture(): string {
	mkdirSync(FIXTURE_ROOT, { recursive: true });
	// 第1階層フォルダ 3 個、 配下に exe を 1 つずつ置く (entries 3 件想定)。
	for (const name of ['AppA', 'AppB', 'AppC']) {
		const dir = join(FIXTURE_ROOT, name);
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, 'launcher.exe'), 'MZ');
	}
	return FIXTURE_ROOT;
}

function cleanupFixture(): void {
	try {
		rmSync(FIXTURE_ROOT, { recursive: true, force: true });
	} catch {
		// 既に消えていても無視
	}
}

test('PH-CF-900 A1-4: 2 回目 mount は cache hit で entries 即取得 (cold walk 不要)', async ({
	page,
}) => {
	test.setTimeout(120_000);
	const root = buildFixture();
	try {
		// invalidate (前 run の cache が残っていれば消す、 best-effort)。
		await invoke(page, 'cmd_invalidate_exe_scan_cache', {
			root,
			depth: 2,
			extensions: DEFAULT_EXTS,
		}).catch(() => {});

		// --- 1 回目: 必ず miss、 fresh scan + cache save 経路をシミュレート ---
		const missBefore = await invoke<unknown[] | null>(page, 'cmd_get_exe_scan_cached', {
			root,
			depth: 2,
			extensions: DEFAULT_EXTS,
		});
		expect(missBefore, '初回 mount は cache miss').toBeNull();

		const fresh = await invoke<unknown[]>(page, 'cmd_scan_exe_folders', {
			searchId: 'ph-cf-900-a14-fresh',
			root,
			depth: 2,
			extensions: DEFAULT_EXTS,
		});
		expect(Array.isArray(fresh)).toBe(true);
		expect(fresh.length).toBe(3);

		// cache に persist (= 実 widget mount 経路と同じ動作)。
		await invoke(page, 'cmd_save_exe_scan_cache', {
			root,
			depth: 2,
			extensions: DEFAULT_EXTS,
			entries: fresh,
		});

		// --- 2 回目: cache hit を `<= 100ms` で取得 + entries 一致 ---
		const t0 = Date.now();
		const cached = await invoke<unknown[] | null>(page, 'cmd_get_exe_scan_cached', {
			root,
			depth: 2,
			extensions: DEFAULT_EXTS,
		});
		const cachedMs = Date.now() - t0;
		console.log(`[perf] exe-scan-cache hit: ${cachedMs}ms (entries=${cached?.length ?? 0})`);
		expect(cached, '2 回目 mount は cache hit').not.toBeNull();
		expect(cached?.length).toBe(3);
		expect(cachedMs, 'cache hit は IPC 1 往復のみ (cold walk 不要)').toBeLessThanOrEqual(100);

		// entries が round-trip で一致 (folder_path / folder_name 順)。
		const cachedNames = (cached as Array<{ folderName: string }>).map((e) => e.folderName).sort();
		const freshNames = (fresh as Array<{ folderName: string }>).map((e) => e.folderName).sort();
		expect(cachedNames).toEqual(freshNames);
	} finally {
		// 仕込んだ cache を残さない (他 perf spec への影響を避ける)。
		await invoke(page, 'cmd_invalidate_exe_scan_cache', {
			root,
			depth: 2,
			extensions: DEFAULT_EXTS,
		}).catch(() => {});
		cleanupFixture();
	}
});

test('PH-CF-900 A1-4: cache key (depth) が変わると cache miss になる', async ({ page }) => {
	test.setTimeout(60_000);
	const root = buildFixture();
	try {
		await invoke(page, 'cmd_invalidate_exe_scan_cache', {
			root,
			depth: 2,
			extensions: DEFAULT_EXTS,
		}).catch(() => {});

		// depth=2 で cache 仕込み
		const fresh2 = await invoke<unknown[]>(page, 'cmd_scan_exe_folders', {
			searchId: 'ph-cf-900-a14-key-depth-2',
			root,
			depth: 2,
			extensions: DEFAULT_EXTS,
		});
		await invoke(page, 'cmd_save_exe_scan_cache', {
			root,
			depth: 2,
			extensions: DEFAULT_EXTS,
			entries: fresh2,
		});

		// depth=2 は hit
		const hit = await invoke<unknown[] | null>(page, 'cmd_get_exe_scan_cached', {
			root,
			depth: 2,
			extensions: DEFAULT_EXTS,
		});
		expect(hit, 'depth=2 は同 key で cache hit').not.toBeNull();

		// depth=3 は miss (別 key)
		const miss = await invoke<unknown[] | null>(page, 'cmd_get_exe_scan_cached', {
			root,
			depth: 3,
			extensions: DEFAULT_EXTS,
		});
		expect(miss, 'depth が違うと別 key で cache miss').toBeNull();
	} finally {
		for (const d of [2, 3]) {
			await invoke(page, 'cmd_invalidate_exe_scan_cache', {
				root,
				depth: d,
				extensions: DEFAULT_EXTS,
			}).catch(() => {});
		}
		cleanupFixture();
	}
});
