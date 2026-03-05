import { expect, test } from '../fixtures/tauri.js';
import { invoke, isSetupComplete } from '../helpers/ipc.js';

test.describe('設定', () => {
	test('ホットキー設定が IPC から読み込めること', async ({ page }) => {
		// IPC でホットキー設定を取得
		const hotkey = await invoke<string>(page, 'cmd_get_hotkey');

		// 設定が文字列として取得できることを確認
		expect(typeof hotkey).toBe('string');
		expect(hotkey.length).toBeGreaterThan(0);
	});

	test('セットアップ完了状態が boolean で返ること', async ({ page }) => {
		const result = await isSetupComplete(page);
		expect(typeof result).toBe('boolean');
	});
});
