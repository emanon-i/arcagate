import { expect, test } from '../fixtures/tauri.js';
import { invoke } from '../helpers/ipc.js';

test.describe('設定', () => {
	test('設定パネルが表示されること', async ({ page }) => {
		// 「設定」タブに切り替え
		await page.getByRole('button', { name: '設定' }).click();

		// 設定パネルのコンテンツが表示されることを確認
		// グローバルホットキーセクション
		await expect(page.getByText('グローバルホットキー')).toBeVisible();
	});

	test('ホットキー設定が IPC から読み込まれること', async ({ page }) => {
		// IPC でホットキー設定を取得
		const hotkey = await invoke<string>(page, 'cmd_get_hotkey');

		// 設定が文字列として取得できることを確認
		expect(typeof hotkey).toBe('string');
		expect(hotkey.length).toBeGreaterThan(0);

		// 「設定」タブに切り替え
		await page.getByRole('button', { name: '設定' }).click();

		// ホットキーセクションが表示されること
		await expect(page.getByText('グローバルホットキー')).toBeVisible();
	});
});
