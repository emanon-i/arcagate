import { expect, test } from '../fixtures/tauri.js';
import { createItem, deleteItem, invoke } from '../helpers/ipc.js';

test.describe('launch エラー診断 (Nielsen H9 / PH-417 + PH-422)', () => {
	test('存在しない exe path → 「ファイルが見つかりません」 toast', async ({ page }) => {
		// 不在 path を持つ item を作成 → launchItem → preflight_check で LaunchFileNotFound
		const item = await createItem(page, {
			item_type: 'exe',
			label: 'Nonexistent App',
			target: 'Z:/__arcagate_e2e_nonexistent__/foo.exe',
		});

		try {
			// パレットを開いて item を検索 → 起動 (Library から起動でも良いが、Library 検索は ItemStore 同期待ちが必要)
			// Direct invoke で launch を試みる
			let errorCaught = false;
			let errorMsg = '';
			try {
				await invoke<void>(page, 'cmd_launch_item', {
					itemId: item.id,
					source: 'palette',
				});
			} catch (e: unknown) {
				errorCaught = true;
				errorMsg = String(e);
			}
			expect(errorCaught).toBe(true);
			// "File not found:" が含まれること (Rust 側 AppError::LaunchFileNotFound)
			expect(errorMsg).toContain('File not found');
		} finally {
			await deleteItem(page, item.id);
		}
	});

	// PH-443 (batch-97 / Codex Q5 #8 残): 拡張子なし path → LaunchNotExecutable
	// CDP 経由で C:/Windows のような既存だが拡張子なしフォルダを exe item として登録 → launch
	// Tauri webview から process.env / std env は取れないが、Windows 実機なら C: ドライブが必ずある
	test('拡張子なし path → 「実行可能ファイルではありません」エラー', async ({ page }) => {
		// 既存だが拡張子のない path → LaunchNotExecutable を発生させる
		// C:/Windows は確実に存在 + 拡張子なしの folder
		const item = await createItem(page, {
			item_type: 'exe',
			label: 'Not Executable Test',
			target: 'C:/Windows',
		});

		try {
			let errorCaught = false;
			let errorCode: string | null = null;
			let errorMsg = '';
			try {
				await invoke<void>(page, 'cmd_launch_item', {
					itemId: item.id,
					source: 'palette',
				});
			} catch (e: unknown) {
				errorCaught = true;
				if (typeof e === 'object' && e !== null && 'code' in e) {
					errorCode = (e as { code: string }).code;
				}
				errorMsg = String(e);
			}
			expect(errorCaught).toBe(true);
			// AppError::LaunchNotExecutable を期待
			// errorCode 経由 (PH-429 構造化) or message contains
			const matched = errorCode === 'launch.not_executable' || errorMsg.includes('Not executable');
			expect(matched).toBe(true);
		} finally {
			await deleteItem(page, item.id);
		}
	});
});
