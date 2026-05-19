import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '../fixtures/tauri.js';
import { addWidget, invoke, listWorkspaces } from '../helpers/ipc.js';

/**
 * PR (widget chrome glass/token sweep) 用 visual evidence spec。
 *
 * 確認対象 (PR description に添付):
 *   1. QuickNote widget textarea の focus ring が widget 内に収まる (右端 clip 解消)
 *   2. workspace 全景 (5 テーマ) の widget chrome 整合
 *
 * 引用元 guideline:
 *   - CLAUDE.md `<critical-rule id="dom-not-fixed">`
 *   - .claude/skills/e2e-tauri-webview2 (Tauri + Playwright + CDP)
 */
const SCREENSHOT_DIR = join(process.cwd(), 'tmp', 'screenshots-pr');

test.beforeAll(() => {
	mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test('screenshot: workspace overview Dark / Light', async ({ page }) => {
	// workspace タブへ
	await page.getByRole('button', { name: 'Workspace', exact: true }).click();
	await expect(page.getByTestId('canvas-toolbar')).toBeVisible({ timeout: 15_000 });

	// seed widget: QuickNote + Snippet + Script-folder (空状態) を Home に追加
	const workspaces = await listWorkspaces(page);
	const wsId = workspaces[0]?.id;
	if (!wsId) throw new Error('home workspace missing');

	// 既存 widget が無ければ seed
	const existing = await invoke<unknown[]>(page, 'cmd_list_widgets', { workspaceId: wsId });
	if (existing.length === 0) {
		await addWidget(page, wsId, 'quick_note');
		await addWidget(page, wsId, 'snippet');
		await addWidget(page, wsId, 'script_folder');
	}
	// reload で seed 結果を反映
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.getByRole('button', { name: 'Workspace', exact: true }).click();
	await expect(page.getByTestId('canvas-toolbar')).toBeVisible({ timeout: 15_000 });
	await page.waitForTimeout(800);

	// Dark theme (default)
	await invoke<void>(page, 'cmd_set_active_theme_mode', { mode: 'dark' }).catch(() => {});
	await page.waitForTimeout(400);
	await page.screenshot({
		path: join(SCREENSHOT_DIR, 'workspace-dark.png'),
		fullPage: false,
	});

	// Light theme
	await invoke<void>(page, 'cmd_set_active_theme_mode', { mode: 'light' }).catch(() => {});
	await page.waitForTimeout(400);
	await page.screenshot({
		path: join(SCREENSHOT_DIR, 'workspace-light.png'),
		fullPage: false,
	});
});

test('screenshot: QuickNote textarea focus ring (inset, no right-edge clip)', async ({ page }) => {
	await page.getByRole('button', { name: 'Workspace', exact: true }).click();
	await expect(page.getByTestId('canvas-toolbar')).toBeVisible({ timeout: 15_000 });

	// QuickNote widget の textarea を locate
	const textarea = page.locator('textarea').first();
	const exists = (await textarea.count()) > 0;
	if (!exists) {
		test.skip(true, 'QuickNote widget not seeded; relies on previous spec to add it');
		return;
	}

	// focus → ring が widget glass の右端で clip されないことを screenshot で確認
	await textarea.focus();
	await page.waitForTimeout(300);
	const handle = await textarea.elementHandle();
	if (handle) {
		// widget body 全体を一度撮る (focus ring が widget の border 内に収まることを visual に確認)
		const widgetBody = await textarea.evaluateHandle((el) => el.closest('.widget-shell'));
		const widgetEl = widgetBody.asElement();
		if (widgetEl) {
			await widgetEl.screenshot({
				path: join(SCREENSHOT_DIR, 'quicknote-textarea-focus-dark.png'),
			});
		}
	}

	// Light theme でも撮る
	await invoke<void>(page, 'cmd_set_active_theme_mode', { mode: 'light' }).catch(() => {});
	await page.waitForTimeout(400);
	await textarea.focus();
	await page.waitForTimeout(200);
	const widgetBody2 = await textarea.evaluateHandle((el) => el.closest('.widget-shell'));
	const widgetEl2 = widgetBody2.asElement();
	if (widgetEl2) {
		await widgetEl2.screenshot({
			path: join(SCREENSHOT_DIR, 'quicknote-textarea-focus-light.png'),
		});
	}

	// Dark に戻す (後続 spec への影響を避ける)
	await invoke<void>(page, 'cmd_set_active_theme_mode', { mode: 'dark' }).catch(() => {});
});
