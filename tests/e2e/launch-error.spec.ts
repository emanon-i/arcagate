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

	test('拡張子なし path → 「実行可能ファイルではありません」エラー', async ({ page }) => {
		// CARGO_MANIFEST_DIR は存在するが拡張子なし → LaunchNotExecutable
		// ただし e2e からは Rust 側 manifest_dir を取れないので、テスト用に固定パスを使う
		// 代わりに Library 経由で「拡張子なし path」を作って起動を試みる
		// Note: 実機 path に依存しないようテストを simpler に → Library アクセスで toast 文言確認
		// この case は preflight_check 単体テストで担保済 (Rust 側 6 テスト)
		// e2e は LaunchFileNotFound 1 ケースのみで H9 文言検証を担保する。
		test.skip(
			true,
			'preflight_check のテストは Rust 単体テスト (services::launch_service::tests) で担保済み',
		);
	});
});
