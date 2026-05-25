/**
 * PH-CF-1210 ⑨ 実 UI e2e:
 *   widget 内アイテムの **click** と **右クリック「Default app で開く」** が同じ cascade
 *   (`card_override.opener_id → widget.default_opener_id → item.default_app / system`)
 *   を通り、 同じ opener + 同じ target で launch 要求を出すことを実 UI 経路で機械検証する。
 *
 * PH-CF-1200 ⑨ の修正は static audit + frontend unit + Rust unit のみで、 実 UI 経路は
 * 検証されていなかった (user 報告: 「実機で何も変わっていない」)。 本 spec は:
 *   - ItemWidget + custom user opener を実 IPC で構築 (UI 経路は ItemWidget.handleLaunch /
 *     WidgetItemContextMenu.handleLaunchDefault → launchItemWithCascade)
 *   - launcher::try_spawn_cmd の build-flag シーム (--features test-launch-seam) で実 spawn を
 *     skip しつつ `{ program, args, cwd }` を log file に append
 *   - spec 側 (helpers/launch-seam.ts) が log を読み、 click 経路と右クリック経路で完全一致
 *     (= 同じ opener + 同じ target) であることを assert
 *
 * 合成 hook で UI を丸ごとバイパスする検証・skip・assert 緩和は禁止。
 *   - launch / spawn の葉 1 点だけシームに差し替え
 *   - それ以外 (UI 操作 → svelte handler → cascade → cmd_launch_with_opener → opener resolve →
 *     path 検証 → spawn 葉) は全部本物の経路を通る
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/tauri.js';
import {
	addWidget,
	createItem,
	deleteItem,
	deleteOpener,
	deleteWidget,
	type Item,
	listItems,
	saveOpener,
	updateWidgetConfig,
	waitForHomeWorkspace,
} from '../helpers/ipc.js';
import { clearSeamLog, pollSeamRecords, type SeamRecord } from '../helpers/launch-seam.js';

/**
 * Workspace view へ切替えて WorkspaceLayout の mount を triger → `workspaceConfig.loadWorkspaces()`
 * が走り、 初回時には Home workspace が auto-create される。
 * `waitForHomeWorkspace(page)` を呼ぶ **前** に必ず通す (= 既存 routine-widget.spec と同じ pattern)。
 */
async function openWorkspace(page: Page): Promise<void> {
	await page.evaluate(() => localStorage.setItem('arcagate.app.activeView', 'workspace'));
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });
}

/** Windows の case-insensitive / 区切り混在を吸収して比較する。 */
function pathEq(a: string, b: string): boolean {
	return a.replace(/\\/g, '/').toLowerCase() === b.replace(/\\/g, '/').toLowerCase();
}

test.afterEach(async ({ page }) => {
	// 開いた context menu / popover を確実に閉じてから次 spec へ
	await page.keyboard.press('Escape').catch(() => {});
	await page.keyboard.press('Escape').catch(() => {});
});

test('ItemWidget: click と 右クリック「Default app で開く」 が同じ widget opener + 同じ target を spawn する (PH-CF-1210 ⑨)', async ({
	page,
}) => {
	// 1) 実 fs に temp folder + 1 つの .exe を作る (path 実在検証が通るように)。
	const root = mkdtempSync(join(tmpdir(), 'arcagate-e2e-widget-launch-'));
	const exePath = join(root, 'demo.exe');
	writeFileSync(exePath, Buffer.from('MZ\x00\x00'));

	// workspace view を先に開いて WorkspaceLayout → loadWorkspaces → Home auto-create を triger。
	await openWorkspace(page);
	const ws = await waitForHomeWorkspace(page);

	// 2) custom user opener を実 IPC で作る (notepad で開く template)。
	//    builtin:explorer 等は launcher::launch_folder を経由するため、 widget の `launchArgv`
	//    経路 (= user opener / builtin:vscode 等の template 系) と程よく違う leaf を測りたい。
	//    notepad は MZ ヘッダだけの偽 exe でも seam で spawn が skip されるので副作用なし。
	const opener = await saveOpener(page, {
		id: null,
		name: 'E2E Test Opener (PH-CF-1210)',
		command_template: 'notepad "<path>"',
		icon_path: null,
		sort_order: 50,
	});

	// 3) Library item を直接作る (ItemWidget は item_ids で参照、 scan 待ち不要)。
	const item = await createItem(page, {
		item_type: 'exe',
		label: 'Demo Exe',
		target: exePath,
		aliases: [],
		tag_ids: [],
		is_tracked: true,
	});

	// 4) ItemWidget を追加し、 item_ids + default_opener_id を config に入れる。
	const widget = await addWidget(page, ws.id, 'item');
	await updateWidgetConfig(
		page,
		widget.id,
		JSON.stringify({
			item_ids: [item.id],
			view_mode: 'list',
			default_opener_id: opener.id,
		}),
	);

	try {
		// 5) workspace view を再 reload して新しく追加した widget を mount。
		await openWorkspace(page);
		const widgetEl = page.locator(`[data-widget-id="${widget.id}"]`);
		await widgetEl.waitFor({ state: 'visible', timeout: 20_000 });

		// 6) ItemWidget の row (list mode) を探す: `aria-label` が
		//    `widgets.common.launch_label` で "Demo Exe を起動" / "Launch Demo Exe" 等。
		//    item.label を含む button を選択 (locale に依存しない hasText で wrap)。
		const itemBtn = widgetEl.locator('button').filter({ hasText: 'Demo Exe' }).first();
		await itemBtn.waitFor({ state: 'visible', timeout: 10_000 });

		// === click 経路 ===
		clearSeamLog();
		await itemBtn.click();
		const afterClick = await pollSeamRecords(1);
		expect(afterClick, 'click 経路で spawn 要求が出ていない').toHaveLength(1);

		// === 右クリック 経路 ===
		clearSeamLog();
		await itemBtn.click({ button: 'right' });
		// WidgetItemContextMenu の「Default app で開く」 button (data-testid)。
		// item を渡している context menu でだけ表示される、 PR #578 修正の主役。
		const defaultBtn = page.getByTestId('widget-context-launch-default');
		await defaultBtn.waitFor({ state: 'visible', timeout: 5_000 });
		await defaultBtn.click();
		const afterRightClick = await pollSeamRecords(1);
		expect(
			afterRightClick,
			'右クリック「Default app で開く」 で spawn 要求が出ていない',
		).toHaveLength(1);

		// === click と 右クリック の opener + target が完全一致 (PH-CF-1210 ⑨ の核) ===
		const c = afterClick[0];
		const r = afterRightClick[0];
		// program (opener template の最初の token) が一致 → 同じ opener を選んだ
		expect(r.program, '右クリックが click と異なる opener を起動した').toBe(c.program);
		// args の path 引数も一致 → 同じ target に向けて launch した
		expect(r.args.length, 'spawn arg 数が click と乖離').toBe(c.args.length);
		for (let i = 0; i < c.args.length; i++) {
			const a = c.args[i];
			const b = r.args[i];
			if (a === b) continue;
			// path 引数だけは case / separator 違いを吸収
			expect(pathEq(a, b), `arg[${i}] が click と一致しない (click=${a} / right=${b})`).toBe(true);
		}
		// 念のため: いずれの spawn も notepad (= 設定した user opener) を呼んでいること
		expect(
			c.program.toLowerCase(),
			'click 経路が widget の opener (notepad) ではない program を起動した',
		).toContain('notepad');
		expect(
			r.program.toLowerCase(),
			'右クリック経路が widget の opener (notepad) ではない program を起動した',
		).toContain('notepad');
		// target がちゃんと exePath を渡している (validate_existing_path も通っている = "not found" 再発無し)
		const argsLower = c.args.map((a) => a.toLowerCase());
		expect(
			argsLower.some((a) => pathEq(a, exePath)),
			`click 経路の spawn args に exePath が含まれていない (records=${JSON.stringify(c)})`,
		).toBe(true);
	} finally {
		// cleanup (best-effort)。 失敗しても次 spec に影響させない。
		await deleteWidget(page, widget.id).catch(() => {});
		await deleteItem(page, item.id).catch(() => {});
		await deleteOpener(page, opener.id).catch(() => {});
		try {
			rmSync(root, { recursive: true, force: true });
		} catch {
			// best-effort
		}
	}
});

/**
 * PH-CF-1210 ⑨ 補完: widget に `default_opener_id` が **設定されていない** とき、
 * 右クリック「Default app で開く」 は system default (`cmd_launch_item` 経由) に落ちる。
 * これは 「click 経路と右クリック経路で同じ cascade」 という契約の逆方向。
 *
 * click 経路は widget opener 無しなら handleLaunch も `launchItem(item.id)` (= cmd_launch_item)
 * に落ちる。 両方とも item.target を spawn → 同じ program / 同じ args になることを検証。
 */
test('ItemWidget: widget opener 未設定なら click も右クリックも cmd_launch_item 経由 = item.target 直 spawn (PH-CF-1210 ⑨ fallback)', async ({
	page,
}) => {
	const root = mkdtempSync(join(tmpdir(), 'arcagate-e2e-widget-launch-fb-'));
	const exePath = join(root, 'fallback.exe');
	writeFileSync(exePath, Buffer.from('MZ\x00\x00'));

	await openWorkspace(page);
	const ws = await waitForHomeWorkspace(page);
	const item = await createItem(page, {
		item_type: 'exe',
		label: 'Fallback Exe',
		target: exePath,
		aliases: [],
		tag_ids: [],
		is_tracked: true,
	});

	const widget = await addWidget(page, ws.id, 'item');
	await updateWidgetConfig(
		page,
		widget.id,
		JSON.stringify({
			item_ids: [item.id],
			view_mode: 'list',
			// default_opener_id は意図的に omit (= cascade の 3. system default に落ちる)
		}),
	);

	try {
		await openWorkspace(page);
		const widgetEl = page.locator(`[data-widget-id="${widget.id}"]`);
		await widgetEl.waitFor({ state: 'visible', timeout: 20_000 });
		const itemBtn = widgetEl.locator('button').filter({ hasText: 'Fallback Exe' }).first();
		await itemBtn.waitFor({ state: 'visible', timeout: 10_000 });

		// click
		clearSeamLog();
		await itemBtn.click();
		const c = (await pollSeamRecords(1))[0] as SeamRecord;
		expect(
			pathEq(c.program, exePath),
			`click 経路が item.target を直接 spawn していない (program=${c.program})`,
		).toBe(true);

		// 右クリック → Default app で開く
		clearSeamLog();
		await itemBtn.click({ button: 'right' });
		await page.getByTestId('widget-context-launch-default').click();
		const r = (await pollSeamRecords(1))[0] as SeamRecord;
		expect(
			pathEq(r.program, c.program),
			'widget opener 未設定で click と右クリックの program が乖離している (= 同じ cascade を通っていない)',
		).toBe(true);
		expect(r.args.length, 'widget opener 未設定で args 数が乖離').toBe(c.args.length);
	} finally {
		await deleteWidget(page, widget.id).catch(() => {});
		await deleteItem(page, item.id).catch(() => {});
		try {
			rmSync(root, { recursive: true, force: true });
		} catch {
			// best-effort
		}
	}
});

/**
 * PH-CF-1210 ⑨ ExeFolderWatchWidget 経路 (= user 報告の主舞台):
 *   実 fs scan → auto-register → list row の click と 右クリック「Default app で開く」 が
 *   同じ widget opener + 同じ exe target を spawn することを e2e で検証する。
 *
 *   ItemWidget 版が WidgetItemContextMenu の共通契約を verify するのに対し、 本 spec は
 *   ExeFolder 固有の (a) `launchEntry` (= scan 結果から matched item を引いて launch) と
 *   (b) entry row の `oncontextmenu` (= entry の path / matchedItem を openMenuFor に渡す)
 *   経路の両方が cascade と一致することを保証する。
 */
test('ExeFolderWatchWidget: click と 右クリック「Default app で開く」 が同じ widget opener + 同じ target を spawn する (PH-CF-1210 ⑨)', async ({
	page,
}) => {
	const root = mkdtempSync(join(tmpdir(), 'arcagate-e2e-exefolder-widget-launch-'));
	const sub = join(root, 'OnlyOne');
	mkdirSync(sub, { recursive: true });
	const exePath = join(sub, 'sample.exe');
	writeFileSync(exePath, Buffer.from('MZ\x00\x00'));

	await openWorkspace(page);
	const ws = await waitForHomeWorkspace(page);

	const opener = await saveOpener(page, {
		id: null,
		name: 'E2E ExeFolder Opener (PH-CF-1210)',
		command_template: 'notepad "<path>"',
		icon_path: null,
		sort_order: 51,
	});

	const widget = await addWidget(page, ws.id, 'exe_folder');
	await updateWidgetConfig(
		page,
		widget.id,
		JSON.stringify({
			watch_path: root,
			scan_depth: 2,
			extensions: ['exe'],
			default_opener_id: opener.id,
			view_mode: 'list',
		}),
	);

	let registered: Item | undefined;
	try {
		await openWorkspace(page);
		const widgetEl = page.locator(`[data-widget-id="${widget.id}"]`);
		await widgetEl.waitFor({ state: 'visible', timeout: 20_000 });

		// scan 完了 + auto-register 完了を listItems で確認 (item が表示前提)。
		const startWait = Date.now();
		while (Date.now() - startWait < 20_000) {
			const items = await listItems(page);
			registered = items.find((i) => pathEq(i.target, exePath));
			if (registered) break;
			await new Promise((r) => setTimeout(r, 250));
		}
		expect(
			registered,
			`scan 後の auto-register された exe item が listItems に現れない`,
		).toBeTruthy();

		// list mode の entry row を探す (folderName = "OnlyOne"、 ja: aria-label に含まれる)。
		const entryBtn = widgetEl.locator('button').filter({ hasText: 'OnlyOne' }).first();
		await entryBtn.waitFor({ state: 'visible', timeout: 10_000 });

		// click
		clearSeamLog();
		await entryBtn.click();
		const c = (await pollSeamRecords(1))[0] as SeamRecord;
		expect(
			c.program.toLowerCase(),
			'click 経路で widget opener (notepad) が起動していない',
		).toContain('notepad');
		expect(
			c.args.some((a) => pathEq(a, exePath)),
			`click 経路の spawn args に exePath が含まれていない (records=${JSON.stringify(c)})`,
		).toBe(true);

		// 右クリック → Default app で開く
		clearSeamLog();
		await entryBtn.click({ button: 'right' });
		const defaultBtn = page.getByTestId('widget-context-launch-default');
		await defaultBtn.waitFor({ state: 'visible', timeout: 5_000 });
		await defaultBtn.click();
		const r = (await pollSeamRecords(1))[0] as SeamRecord;
		expect(r.program, '右クリックが click と異なる opener を起動した').toBe(c.program);
		expect(r.args.length, 'args 数が click と乖離').toBe(c.args.length);
		for (let i = 0; i < c.args.length; i++) {
			const a = c.args[i];
			const b = r.args[i];
			if (a === b) continue;
			expect(pathEq(a, b), `arg[${i}] が click と一致しない (click=${a} / right=${b})`).toBe(true);
		}
	} finally {
		await deleteWidget(page, widget.id).catch(() => {});
		if (registered) await deleteItem(page, registered.id).catch(() => {});
		await deleteOpener(page, opener.id).catch(() => {});
		try {
			rmSync(root, { recursive: true, force: true });
		} catch {
			// best-effort
		}
	}
});
