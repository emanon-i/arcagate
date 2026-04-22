import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/tauri.js';

async function openSettings(page: Page) {
	await page.getByRole('button', { name: 'Settings' }).click();
	await expect(page.getByRole('dialog')).toBeVisible();
}

test.describe('設定パネル', () => {
	test('設定パネルが TitleBar から開閉できること', { tag: '@smoke' }, async ({ page }) => {
		await openSettings(page);
		// ✕ ボタンで閉じる（keyboard Escape は dialog div がフォーカスを持つ必要があるため button を使用）
		await page.getByRole('button', { name: '設定を閉じる' }).click();
		await expect(page.getByRole('dialog')).not.toBeVisible();
	});

	test('ホットキー入力が recording 状態になること', async ({ page }) => {
		await openSettings(page);

		await page.getByRole('button', { name: '変更' }).click();
		await expect(page.locator('input[aria-label="ホットキー表示"]')).toHaveValue(
			'キーを押してください...',
		);

		await page.getByRole('button', { name: 'キャンセル' }).click();
		await expect(page.locator('input[aria-label="ホットキー表示"]')).not.toHaveValue(
			'キーを押してください...',
		);
	});

	test('テーマボタンが表示されていること', async ({ page }) => {
		await openSettings(page);

		await expect(page.getByRole('button', { name: 'ダーク' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'ライト' })).toBeVisible();
	});

	test('テーマを切り替えられること', async ({ page }) => {
		await openSettings(page);

		const htmlEl = page.locator('html');
		const isDark = await htmlEl.evaluate((el) => el.classList.contains('dark'));

		if (isDark) {
			await page.getByRole('button', { name: 'ライト' }).click();
			await expect(htmlEl).not.toHaveClass(/dark/);
			await page.getByRole('button', { name: 'ダーク' }).click();
		} else {
			await page.getByRole('button', { name: 'ダーク' }).click();
			await expect(htmlEl).toHaveClass(/dark/);
			await page.getByRole('button', { name: 'ライト' }).click();
		}
	});
});
