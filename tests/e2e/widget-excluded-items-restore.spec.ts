import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/tauri.js';
import {
	addWidget,
	addWidgetItemHide,
	deleteWidget,
	listWidgetItemHides,
	updateWidgetConfig,
	waitForHomeWorkspace,
} from '../helpers/ipc.js';

/**
 * PH-CF-500: 除外アイテム復元 UI の e2e。
 *
 * 受け入れ条件 (PH-CF-500 §受け入れ条件 / `_chrome-consistency.md` §A8):
 *  - フォルダ監視 / EXE フォルダ監視 の Settings dialog に「除外したアイテム」 section が存在
 *  - 除外 0 件: 空状態文言が出る
 *  - 除外あり: entry が一覧され、 「復元」 click で widget_item_hides から消える (即時反映)
 *
 * 注意: 実 scan (実 OS フォルダの再帰 walk) は e2e では起こさない。 widget_item_hides の
 * 表示 / 復元 セマンティクスを backend IPC と UI 経路で verify する (= scan 後の復活は
 * `_chrome-consistency.md` §A8 にあるとおり次 scan で起きる契約)。
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
	const libraryTab = page.getByRole('button', { name: 'Library', exact: true });
	if (await libraryTab.isVisible().catch(() => false)) {
		await libraryTab.click().catch(() => {});
	}
});

async function openSettingsDialog(page: Page, widgetId: string): Promise<void> {
	await openWorkspace(page);
	const widget = page.locator(`[data-widget-id="${widgetId}"]`);
	await widget.waitFor({ state: 'visible', timeout: 15_000 });
	// settings 歯車 button は menuItems の右端 (WidgetShell `K-12` 規約)。
	// 設定 dialog の一意な title (`widgets.settings_dialog_title`) で開閉検証する。
	const settingsBtn = widget.getByRole('button', { name: '設定' });
	await settingsBtn.click();
	// dialog は heading 「<label> の設定」 (i18n) を持つ。
	await expect(page.getByRole('heading', { name: /の設定$/ })).toBeVisible({ timeout: 5_000 });
}

test('projects: Settings dialog に「除外したアイテム」 section + 空状態文言が出る', async ({
	page,
}) => {
	await openWorkspace(page);
	const ws = await waitForHomeWorkspace(page);
	const widget = await addWidget(page, ws.id, 'projects');
	try {
		await openSettingsDialog(page, widget.id);

		// section 自体が存在する (= 監視 widget の復元 UI 契約 §A8 の DOM チェック)。
		const section = page.getByTestId('widget-excluded-items-section');
		await expect(section).toBeVisible();
		// 空状態文言。
		await expect(section.getByTestId('widget-excluded-items-empty')).toBeVisible();
	} finally {
		await deleteWidget(page, widget.id).catch(() => {});
	}
});

test('exe-folder: 既存 hide が section に表示され、 復元 click で list / store から消える', async ({
	page,
}) => {
	await openWorkspace(page);
	const ws = await waitForHomeWorkspace(page);
	const widget = await addWidget(page, ws.id, 'exe_folder');
	const entryKey = 'D:\\fake\\probe-folder';
	try {
		// scan 自体は起こさず、 PH-CF-100 の hide テーブルへ直接 insert (UI 上での見え方を verify)。
		await addWidgetItemHide(page, widget.id, entryKey);
		// widget が実在するよう dummy watch_path を入れて empty 状態を抜け、 settings 経路で section を開く。
		await updateWidgetConfig(page, widget.id, JSON.stringify({ watch_path: '' }));

		await openSettingsDialog(page, widget.id);

		// section 内に対象 entry が表示される。
		const section = page.getByTestId('widget-excluded-items-section');
		const row = section.getByTestId('widget-excluded-items-row').filter({ hasText: entryKey });
		await expect(row).toHaveCount(1);

		// 復元 click → store / DB 双方から消える (= 即時反映、 instant-feedback rule)。
		await row.getByTestId('widget-excluded-items-restore').click();
		await expect(
			section.getByTestId('widget-excluded-items-row').filter({ hasText: entryKey }),
		).toHaveCount(0);
		await expect(section.getByTestId('widget-excluded-items-empty')).toBeVisible();

		// backend にも反映されている (DB レイヤ verify)。
		const remaining = await listWidgetItemHides(page, widget.id);
		expect(remaining).not.toContain(entryKey);
	} finally {
		await deleteWidget(page, widget.id).catch(() => {});
	}
});
