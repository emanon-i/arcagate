/**
 * SPAWN_HORIZONTAL_PATHEXT_SEAM_2026-05-26 audit (b/d) を実機検証する e2e。
 *
 * 検証対象 (4 spawn 経路):
 *   1. `launch_command` (`ItemType::Command`): user 入力 command 文字列の第 1 token (bare name)
 *      が PATHEXT 経由で `.cmd` shim を絶対 path に解決して spawn する。
 *   2. `launch_exe_args` (folder の legacy `default_app`): bare name の default_app が同様に解決される。
 *   3. `script_runner::run_script` (スクリプト監視): interpreter (`cmd` / `node` 等) が
 *      `launcher::resolved_command` 経由で PATHEXT 解決 + `try_spawn_cmd` シーム経由で spawn される。
 *   4. `cmd_reveal_in_explorer`: `explorer.exe` spawn が `launcher::reveal_in_explorer` → `try_spawn_cmd`
 *      シーム経由で記録される (= cascade verify の blind spot が解消されている)。
 *
 * 上流の UI 経路を bypass する合成 hook は禁止 (PR #570 の教訓)。 IPC を直接呼ぶ test もあるが、
 * それは `cmd_launch_item` / `cmd_run_script` / `cmd_reveal_in_explorer` の **production と同じ
 * commands layer** を踏む経路で、 launcher 葉の手前まで実 production パスを通る。
 *
 * 引用元:
 *   docs/l3_phases/audit/SPAWN_HORIZONTAL_PATHEXT_SEAM_2026-05-26.md
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '../fixtures/tauri.js';
import {
	confirmItem,
	confirmScript,
	createItem,
	deleteItem,
	launchItem,
	revealInExplorer,
	runScript,
	updateItem,
} from '../helpers/ipc.js';
import { clearSeamLog, pollSeamRecords } from '../helpers/launch-seam.js';

function normalizePath(p: string): string {
	// Windows `fs::canonicalize` は `\\?\C:\...` 形式 (verbatim long-path prefix) を返すため、
	// prefix を剥がした上で separator を `/` に揃え、 case を畳んで比較する。
	const stripped = p.replace(/^\\\\\?\\/, '').replace(/^\/\/\?\//, '');
	return stripped.replace(/\\/g, '/').toLowerCase();
}

function pathEq(a: string, b: string): boolean {
	return normalizePath(a) === normalizePath(b);
}

function shimBareName(): string {
	const name = process.env.ARCAGATE_TEST_PATHEXT_SHIM_NAME;
	if (!name) {
		throw new Error(
			'ARCAGATE_TEST_PATHEXT_SHIM_NAME env not set — global-setup.ts must define it before tests run',
		);
	}
	return name;
}

function shimDir(): string {
	const dir = process.env.ARCAGATE_TEST_PATHEXT_SHIM_DIR;
	if (!dir) {
		throw new Error(
			'ARCAGATE_TEST_PATHEXT_SHIM_DIR env not set — global-setup.ts must define it before tests run',
		);
	}
	return dir;
}

test('Command item: bare name (`<shim>`) が PATHEXT 経由で `.cmd` shim を絶対 path 解決して spawn する (SPAWN_HORIZONTAL audit b)', async ({
	page,
}) => {
	// 真因経路: ItemType::Command の `target` 文字列を shell-words で分割した先頭 token が
	// `launcher::launch_command` → `resolved_command` (PATHEXT) → `try_spawn_cmd` を通る。
	// 旧実装は `Command::new(&program)` 直で、 `pnpm` / `code` 等 `.cmd` shim 起動が NotFound だった。
	const bare = shimBareName();
	const item = await createItem(page, {
		item_type: 'command',
		label: `Spawn audit Command (${bare})`,
		target: `${bare} --probe`,
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});

	try {
		// Command item は audit F15 で初回起動確認 gate あり。 e2e は test fixture として
		// 直接 confirm を呼んでから launch する (UI 確認ダイアログは別 spec で検証済)。
		await confirmItem(page, item.id);

		clearSeamLog();
		await launchItem(page, item.id);
		const recs = await pollSeamRecords(1);
		expect(recs.length, 'launch_command で spawn 要求が出ていない').toBeGreaterThanOrEqual(1);
		const rec = recs[0];
		expect(rec.what, 'spawn 葉が "command" 経路でない').toBe('command');
		// PATHEXT 解決後の絶対 path が記録されているはず: ファイル名 = `${bare}.cmd`。
		expect(
			rec.program.toLowerCase().endsWith(`${bare}.cmd`),
			`bare name "${bare}" が ".cmd" shim に PATHEXT 解決されていない (program=${rec.program})`,
		).toBe(true);
		expect(
			rec.program.includes('\\') || rec.program.includes('/'),
			`resolved program が絶対 path でない (PATHEXT 解決の証拠なし、 program=${rec.program})`,
		).toBe(true);
		expect(
			pathEq(rec.program, join(shimDir(), `${bare}.cmd`)),
			`resolved path が想定 shim ファイルと不一致`,
		).toBe(true);
		// 第 1 token 以降は args として渡る (resolved_command + cmd.args(tokens))。
		expect(rec.args).toEqual(['--probe']);
	} finally {
		await deleteItem(page, item.id).catch(() => {});
	}
});

test('Folder legacy default_app: bare name が PATHEXT 経由で解決され launch_exe_args 経路で spawn する (SPAWN_HORIZONTAL audit b)', async ({
	page,
}) => {
	// folder item の `default_app` が `builtin:` / `user:` prefix を持たない legacy 値の場合、
	// `launch_service::launch_item` は `launcher::launch_exe_args(&opener_id, &[&item.target], None)`
	// を呼ぶ。 PATHEXT 解決を `resolved_command` で集約したため、 bare name `<shim>` が `.cmd` shim
	// として正しく解決されることを確認する。
	const bare = shimBareName();
	const root = mkdtempSync(join(tmpdir(), 'arcagate-e2e-folder-legacy-da-'));
	try {
		// `CreateItemInput` には `default_app` フィールドが無いため、 create 後に updateItem で書き込む。
		// legacy 値 (`builtin:` / `user:` prefix なし) を `default_app` に入れると
		// `launch_service` は `launcher::launch_exe_args(default_app, [target])` 経路に振り分ける。
		const item = await createItem(page, {
			item_type: 'folder',
			label: 'Folder legacy default_app',
			target: root,
			aliases: [],
			tag_ids: [],
			is_tracked: false,
		});
		await updateItem(page, item.id, { default_app: bare });

		try {
			clearSeamLog();
			await launchItem(page, item.id);
			const recs = await pollSeamRecords(1);
			expect(recs.length, 'launch_exe_args で spawn 要求が出ていない').toBeGreaterThanOrEqual(1);
			const rec = recs[0];
			expect(rec.what, 'spawn 葉が "exe_args" 経路でない').toBe('exe_args');
			expect(
				rec.program.toLowerCase().endsWith(`${bare}.cmd`),
				`bare default_app が ".cmd" shim に PATHEXT 解決されていない (program=${rec.program})`,
			).toBe(true);
			expect(
				rec.args.some((a) => pathEq(a, root)),
				`spawn args に folder target が含まれていない (args=${JSON.stringify(rec.args)})`,
			).toBe(true);
		} finally {
			await deleteItem(page, item.id).catch(() => {});
		}
	} finally {
		try {
			rmSync(root, { recursive: true, force: true });
		} catch {
			// best-effort
		}
	}
});

test('script_runner: `.bat` interpreter (`cmd`) が PATHEXT 解決 + try_spawn_cmd seam を通って spawn する (SPAWN_HORIZONTAL audit b/d)', async ({
	page,
}) => {
	// `.bat` の interpreter は `cmd` (bare name)。 旧実装は `Command::new("cmd")` 直 + `.spawn()` 直で
	// PATHEXT 解決も seam も bypass していた。 新実装では `launcher::resolved_command("cmd")` が
	// `cmd.exe` (Windows System32) を絶対 path で掴み、 `try_spawn_cmd` 経由で seam log に記録する。
	const folder = mkdtempSync(join(tmpdir(), 'arcagate-e2e-script-runner-'));
	const scriptPath = join(folder, 'probe.bat');
	writeFileSync(scriptPath, '@echo off\r\nexit /b 0\r\n');
	try {
		// 初回起動確認 gate。 e2e は IPC で直接 confirm。
		await confirmScript(page, folder, scriptPath);

		clearSeamLog();
		await runScript(page, folder, scriptPath);
		const recs = await pollSeamRecords(1);
		expect(
			recs.length,
			'run_script で spawn 要求が出ていない (seam blind spot)',
		).toBeGreaterThanOrEqual(1);
		const rec = recs[0];
		expect(rec.what, 'spawn 葉が "script_runner" 経路でない (= try_spawn_cmd を通っていない)').toBe(
			'script_runner',
		);
		// `cmd` が PATHEXT で `cmd.exe` に解決された絶対 path が記録される。
		expect(
			rec.program.toLowerCase().endsWith('cmd.exe'),
			`interpreter "cmd" が cmd.exe に PATHEXT 解決されていない (program=${rec.program})`,
		).toBe(true);
		expect(
			rec.program.includes('\\') || rec.program.includes('/'),
			`resolved interpreter が絶対 path でない (program=${rec.program})`,
		).toBe(true);
		// args: ["/C", "<scriptPath canonical>"]
		expect(rec.args[0], 'cmd の固定引数 /C が消えている').toBe('/C');
		expect(
			rec.args.some((a) => pathEq(a, scriptPath)),
			`script path が args に含まれていない (args=${JSON.stringify(rec.args)})`,
		).toBe(true);
	} finally {
		try {
			rmSync(folder, { recursive: true, force: true });
		} catch {
			// best-effort
		}
	}
});

test('cmd_reveal_in_explorer: `explorer.exe` spawn が try_spawn_cmd seam に記録される (SPAWN_HORIZONTAL audit d)', async ({
	page,
}) => {
	// 旧 `cmd_reveal_in_explorer` は `Command::new("explorer.exe").spawn()` 直で seam を bypass し、
	// cascade verify e2e の blind spot だった。 新実装では `launcher::reveal_in_explorer` 経由で
	// `try_spawn_cmd(&mut cmd, "reveal")` を通すため、 seam log に記録される。
	const root = mkdtempSync(join(tmpdir(), 'arcagate-e2e-reveal-'));
	try {
		clearSeamLog();
		await revealInExplorer(page, root);
		const recs = await pollSeamRecords(1);
		expect(
			recs.length,
			'reveal_in_explorer で spawn 要求が出ていない (seam blind spot)',
		).toBeGreaterThanOrEqual(1);
		const rec = recs[0];
		expect(rec.what, 'spawn 葉が "reveal" 経路でない').toBe('reveal');
		expect(rec.program.toLowerCase()).toContain('explorer.exe');
		expect(
			rec.args.some((a) => pathEq(a, root)),
			`reveal の args に target path が含まれていない (args=${JSON.stringify(rec.args)})`,
		).toBe(true);
	} finally {
		try {
			rmSync(root, { recursive: true, force: true });
		} catch {
			// best-effort
		}
	}
});
