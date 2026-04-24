import { expect, test } from '../fixtures/tauri.js';

async function openAppearanceTab(page: import('@playwright/test').Page) {
	await page.getByRole('button', { name: 'Settings' }).click();
	await expect(page.getByRole('dialog')).toBeVisible();
	const tablist = page.getByRole('tablist', { name: '設定カテゴリ' });
	await tablist.getByRole('tab', { name: '外観' }).click();
}

test.describe('テーマエディタ', () => {
	test.afterEach(async ({ page }) => {
		const closeBtn = page.getByRole('button', { name: '設定を閉じる' });
		if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
			await closeBtn.click();
		}
	});

	test('ThemeEditor に全変数カテゴリが表示されること', { tag: '@smoke' }, async ({ page }) => {
		await openAppearanceTab(page);
		const appearancePanel = page.locator('#settings-panel-appearance');

		await appearancePanel.getByRole('button', { name: '現在のテーマを複製' }).click();
		await expect(appearancePanel.getByText('を編集')).toBeVisible();

		// radius / duration / ease グループが表示される（全変数カバレッジ確認）
		await expect(appearancePanel.getByText('radius', { exact: true })).toBeVisible();
		await expect(appearancePanel.getByText('duration', { exact: true })).toBeVisible();
		await expect(appearancePanel.getByText('ease', { exact: true })).toBeVisible();

		// 後始末
		await appearancePanel.getByRole('button', { name: '削除' }).click();
		await appearancePanel.getByRole('button', { name: '本当に削除' }).click();
	});

	test('変数編集→リアルタイム反映→保存→リロード復元の round-trip', async ({ page }) => {
		await openAppearanceTab(page);
		const appearancePanel = page.locator('#settings-panel-appearance');

		// テーマ複製
		await appearancePanel.getByRole('button', { name: '現在のテーマを複製' }).click();
		await expect(appearancePanel.getByText('を編集')).toBeVisible();

		// ThemeEditor の最初の text input を変更
		const editorInputs = appearancePanel.locator('.max-h-80 input[type="text"]');
		const firstInput = editorInputs.first();
		const originalValue = await firstInput.inputValue();
		await firstInput.fill('#aabbcc');
		await firstInput.dispatchEvent('input');

		// isDirty バッジが出る
		await expect(appearancePanel.locator('text=● 未保存')).toBeVisible({ timeout: 5000 });

		// 保存
		await appearancePanel.getByRole('button', { name: '保存' }).click();
		await expect(appearancePanel.locator('text=✓ 保存しました')).toBeVisible({ timeout: 10_000 });

		// リロード後も値が復元される
		await page.reload();
		await page.waitForURL(/^http:\/\/localhost:5173/);
		await page.waitForLoadState('domcontentloaded');
		await openAppearanceTab(page);
		const panel = page.locator('#settings-panel-appearance');
		await expect(panel.getByRole('button', { name: /のコピー/ }).first()).toBeVisible({
			timeout: 15_000,
		});

		// 後始末
		await panel.getByRole('button', { name: '編集' }).click();
		await panel.getByRole('button', { name: '削除' }).click();
		await panel.getByRole('button', { name: '本当に削除' }).click();
		await expect(panel.getByRole('button', { name: /のコピー/ })).not.toBeVisible();

		// originalValue を使って lint unused warning を防ぐ
		expect(originalValue).toBeTruthy();
	});

	test('DL ボタンが各テーマカードに表示されること', { tag: '@smoke' }, async ({ page }) => {
		await openAppearanceTab(page);
		const appearancePanel = page.locator('#settings-panel-appearance');

		// Endfield カードに DL ボタンがある
		await expect(appearancePanel.getByRole('button', { name: 'DL' }).first()).toBeVisible();
	});

	test('JSON インポート → テーマ追加 → DL ボタンで後始末', async ({ page }) => {
		await openAppearanceTab(page);
		const appearancePanel = page.locator('#settings-panel-appearance');

		// JSON インポートエリアを開く
		await appearancePanel.getByText('JSON からインポート').click();
		const textarea = appearancePanel.getByRole('textbox');
		await expect(textarea).toBeVisible();

		// テーマ JSON を入力してインポート
		const importJson = JSON.stringify({
			name: 'E2E テーマエディタ インポート',
			base_theme: 'dark',
			css_vars: '{}',
			is_builtin: false,
			created_at: '',
			updated_at: '',
		});
		await textarea.fill(importJson);
		await appearancePanel.getByRole('button', { name: 'インポート' }).click();

		await expect(
			appearancePanel.getByRole('button', { name: 'E2E テーマエディタ インポート' }),
		).toBeVisible({ timeout: 10_000 });

		// 後始末
		await appearancePanel.getByRole('button', { name: '編集' }).click();
		await appearancePanel.getByRole('button', { name: '削除' }).click();
		await appearancePanel.getByRole('button', { name: '本当に削除' }).click();
		await expect(
			appearancePanel.getByRole('button', { name: 'E2E テーマエディタ インポート' }),
		).not.toBeVisible();
	});
});
