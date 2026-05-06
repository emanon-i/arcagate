import { expect, test } from '../fixtures/tauri.js';

async function switchTheme(page: import('@playwright/test').Page, themeName: string) {
	await page.getByRole('button', { name: 'Settings' }).click();
	await expect(page.getByRole('dialog')).toBeVisible();
	const tablist = page.getByRole('tablist', { name: '設定カテゴリ' });
	await tablist.getByRole('tab', { name: '外観' }).click();
	const appearancePanel = page.locator('#settings-panel-appearance');
	await appearancePanel.getByRole('button', { name: themeName }).click();
	await page.getByRole('button', { name: '設定を閉じる' }).click();
}

function getCssVar(page: import('@playwright/test').Page, varName: string) {
	return page.evaluate(
		(v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim(),
		varName,
	);
}

test.describe('テーマ視覚差分（CSS 変数検証）', () => {
	test.afterEach(async ({ page }) => {
		// dark に戻してリセット
		await page.getByRole('button', { name: 'Settings' }).click();
		await expect(page.getByRole('dialog')).toBeVisible();
		const tablist = page.getByRole('tablist', { name: '設定カテゴリ' });
		await tablist.getByRole('tab', { name: '外観' }).click();
		const appearancePanel = page.locator('#settings-panel-appearance');
		await appearancePanel.getByRole('button', { name: 'フラット ダーク' }).click();
		const closeBtn = page.getByRole('button', { name: '設定を閉じる' });
		if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
			await closeBtn.click();
		}
	});

	test('Flat dark の --ag-accent がシアン系であること', async ({ page }) => {
		const accent = await getCssVar(page, '--ag-accent');
		// dark: #22d3ee (cyan)
		expect(accent).toMatch(/^#[0-9a-f]{6}$/i);
		// 青寄りの値であること（赤 < 青）
		const r = parseInt(accent.slice(1, 3), 16);
		const b = parseInt(accent.slice(5, 7), 16);
		expect(b).toBeGreaterThan(r);
	});

	test('Endfield の --ag-accent が Flat dark と異なること', async ({ page }) => {
		const flatAccent = await getCssVar(page, '--ag-accent');
		await switchTheme(page, 'Endfield');
		const endfieldAccent = await getCssVar(page, '--ag-accent');
		expect(endfieldAccent).not.toBe(flatAccent);
	});

	test('Endfield の --ag-surface-page が深青系であること', async ({ page }) => {
		await switchTheme(page, 'Endfield');
		const surfacePage = await getCssVar(page, '--ag-surface-page');
		expect(surfacePage).toBe('#0d1422');
	});

	test('Ubuntu Frosted の --ag-accent がオレンジ系であること', async ({ page }) => {
		await switchTheme(page, 'Ubuntu Frosted');
		const accent = await getCssVar(page, '--ag-accent');
		expect(accent).toBe('#e95420');
	});

	test('Liquid Glass の --ag-backdrop に blur が含まれること', async ({ page }) => {
		await switchTheme(page, 'Liquid Glass');
		const backdrop = await getCssVar(page, '--ag-backdrop');
		expect(backdrop).toContain('blur(');
	});
});
