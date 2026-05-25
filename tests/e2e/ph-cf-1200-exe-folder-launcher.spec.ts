import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/tauri.js';
import {
	addWidget,
	deleteWidget,
	listItems,
	updateWidgetConfig,
	waitForHomeWorkspace,
} from '../helpers/ipc.js';

/**
 * PH-CF-1200 ⑧⑨: ExeFolderWatchWidget の起動 EXE 切替が Library item.target に同期する経路を
 * 実 UI + 実 fs scan を駆動して end-to-end で検証する。
 *
 * 受け入れ条件:
 *  ⑧ widget の popover で別 EXE を選択 → 同 entry の Library item.target が新 path に書き換わる
 *     (旧実装は item をそのまま return → 古い path のまま残留 → Library 経路の起動で "not found")
 *  ⑨ click 経路と context menu「デフォルトアプリで開く」 が同じ cascade helper を通る契約
 *     (= `launchItemWithCascade(item, { widgetDefaultOpenerId })`、 unit test
 *     `launch-cascade.test.ts` で網羅、 widget 側の伝播は `audit-widget-context-opener.sh` で
 *     静的検証、 本 spec は ⑧ の Library 同期経路 e2e に専念する)。
 *
 * 駆動方針:
 *  - 本物の OS fs に temp folder + 第1階層サブフォルダ + 2 つの .exe を実体作成
 *  - widget を addWidget で生成、 watch_path を updateWidgetConfig で設定
 *  - workspace 画面を開いて widget mount → $effect で `cmd_scan_exe_folders` 自走 →
 *    `cmd_register_exe_items_bulk` 自走 で Library 自動登録
 *  - DOM の「more」 button (`aria-label='起動 EXE を変更 …'`) → popover → 別候補を click で
 *    selectExe → syncOverrideToLibrary が実 IPC を発火
 *  - cmd_list_items で item.target が新 path に同期したことを確認
 *
 * 合成 hook で UI を bypass しない (PR #570 の教訓、 dom-not-fixed rule)。
 */

async function openWorkspace(page: Page): Promise<void> {
	await page.evaluate(() => localStorage.setItem('arcagate.app.activeView', 'workspace'));
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });
}

test.afterEach(async ({ page }) => {
	await page.keyboard.press('Escape').catch(() => {});
	await page.keyboard.press('Escape').catch(() => {});
});

test('exe-folder: popover で別 EXE を選択すると Library item.target が新 path に同期する (PH-CF-1200 ⑧)', async ({
	page,
}) => {
	// 1) 実 fs に temp folder + サブフォルダ + 2 つの .exe を作る (実 scan を踏ませる)。
	//    .exe 中身は MZ ヘッダだけで十分 (ExeFolderEntry は path / size / mtime のみ参照)。
	const root = mkdtempSync(join(tmpdir(), 'arcagate-e2e-exefolder-'));
	const sub = join(root, 'GameA');
	mkdirSync(sub, { recursive: true });
	const exeAlpha = join(sub, 'alpha.exe');
	const exeBravo = join(sub, 'bravo.exe');
	writeFileSync(exeAlpha, Buffer.from('MZ\x00\x00'));
	writeFileSync(exeBravo, Buffer.from('MZ\x00\x00'));

	const ws = await waitForHomeWorkspace(page);
	const widget = await addWidget(page, ws.id, 'exe_folder');

	try {
		// 2) widget config に watch_path をセット (extensions は default に従う = exe 含む)。
		await updateWidgetConfig(
			page,
			widget.id,
			JSON.stringify({ watch_path: root, scan_depth: 2, extensions: ['exe'] }),
		);

		// 3) workspace view で widget を mount → 自動 scan + 自動 register。
		await openWorkspace(page);
		const widgetEl = page.locator(`[data-widget-id="${widget.id}"]`);
		await widgetEl.waitFor({ state: 'visible', timeout: 20_000 });

		// 4) Library 自動登録が完了するまで listItems を polling。 初期選択 = alpha.exe
		//    (exeCandidates[0]、 stable order; 環境によって順序が違う可能性は alpha/bravo の
		//    どちらかが target に入ることを許容して検証)。
		const initialItem = await poll(async () => {
			const items = await listItems(page);
			return items.find(
				(it) =>
					it.target === exeAlpha ||
					it.target === exeBravo ||
					it.target.toLowerCase() === exeAlpha.toLowerCase() ||
					it.target.toLowerCase() === exeBravo.toLowerCase(),
			);
		}, 20_000);
		expect(initialItem, 'auto-register された exe item が listItems に現れない').toBeTruthy();
		if (!initialItem) throw new Error('unreachable');
		const initialTarget = initialItem.target;
		// override 後の検証で「変わったこと」 を見るため、 切替先は initial と必ず別の path を選ぶ。
		const nextTarget = samePath(initialTarget, exeAlpha) ? exeBravo : exeAlpha;
		const nextBasename = samePath(nextTarget, exeAlpha) ? 'alpha.exe' : 'bravo.exe';

		// 5) widget entry row の「more (...)」 button を click → popover を開く。
		//    aria-label 起動経路 = `widgets.exe_folder.select_exe_aria` (ja: 「<folder> の起動 EXE を変更」)。
		//    folder 名 'GameA' を contain で拾う (i18n template `{ label }` 埋込)。
		const moreBtn = widgetEl.locator('button[data-popover-trigger="exe-cands"]').first();
		await moreBtn.waitFor({ state: 'visible', timeout: 15_000 });
		await moreBtn.click();

		// 6) popover の menuitem (= 候補 button) のうち、 切替先 basename を含むものを click。
		const popover = widgetEl.locator('[role="menu"]').first();
		await popover.waitFor({ state: 'visible', timeout: 5_000 });
		const candidateBtn = popover
			.locator('button[role="menuitem"]')
			.filter({ hasText: nextBasename })
			.first();
		await candidateBtn.click();

		// 7) selectExe → syncOverrideToLibrary が cmd_register_exe_items_bulk を発火し、
		//    backend `register_exe_item_on_conn` の source 経由 find で既存 item を再発見、
		//    target を新 path に書き戻す (item-lifecycle U-10)。
		const updated = await poll(async () => {
			const items = await listItems(page);
			const it = items.find((i) => i.id === initialItem.id);
			return it && samePath(it.target, nextTarget) ? it : undefined;
		}, 15_000);
		expect(
			updated,
			`item.target が override 後の新 path に同期しない (初期=${initialTarget}, 期待=${nextTarget})`,
		).toBeTruthy();
		// 同 item が再利用されている (新規 row を作っていない) ことも保証。
		const allItems = await listItems(page);
		const matchSource = allItems.filter((i) => samePath(i.target, nextTarget));
		expect(matchSource, 'override 同期で重複 item を作ってはいけない').toHaveLength(1);
	} finally {
		await deleteWidget(page, widget.id).catch(() => {});
		try {
			rmSync(root, { recursive: true, force: true });
		} catch {
			// best-effort
		}
	}
});

/** path 比較: Windows の case-insensitive + 区切り混在 を吸収。 */
function samePath(a: string, b: string): boolean {
	return a.replace(/\\/g, '/').toLowerCase() === b.replace(/\\/g, '/').toLowerCase();
}

/** 条件成立を polling。 戻り値 truthy で resolve、 timeout で undefined。 */
async function poll<T>(
	fn: () => Promise<T | undefined | null | false>,
	timeoutMs: number,
): Promise<T | undefined> {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		const v = await fn();
		if (v) return v as T;
		await new Promise((r) => setTimeout(r, 250));
	}
	return undefined;
}
