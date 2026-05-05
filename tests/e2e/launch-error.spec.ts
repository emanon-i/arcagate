import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/tauri.js';
import { createItem, deleteItem } from '../helpers/ipc.js';

// AppError は `{ code, message }` の構造体で投げられる。helper `invoke()` 経由で
// catch するとPlaywright が page.evaluate の throw 値を `[object Object]` 化して
// 元の code / message が取れない。本 helper は evaluate 内側で捕捉して
// `{ ok: true, value }` または `{ ok: false, code, message }` を返す。
async function invokeForError(
	page: Page,
	cmd: string,
	args: Record<string, unknown>,
): Promise<{ ok: true; value: unknown } | { ok: false; code: string | null; message: string }> {
	return page.evaluate(
		async ([command, arguments_]) => {
			const tauri = (
				window as unknown as {
					__TAURI_INTERNALS__: { invoke: (cmd: string, args?: unknown) => Promise<unknown> };
				}
			).__TAURI_INTERNALS__;
			try {
				const value = await tauri.invoke(command, arguments_);
				return { ok: true, value };
			} catch (e: unknown) {
				const code =
					typeof e === 'object' && e !== null && 'code' in e
						? String((e as { code: unknown }).code)
						: null;
				const message =
					typeof e === 'object' && e !== null && 'message' in e
						? String((e as { message: unknown }).message)
						: typeof e === 'string'
							? e
							: JSON.stringify(e);
				return { ok: false as const, code, message };
			}
		},
		[cmd, args] as [string, Record<string, unknown>],
	);
}

test.describe('launch エラー診断 (Nielsen H9 / PH-417 + PH-422)', () => {
	test('存在しない exe path → 「ファイルが見つかりません」 toast', async ({ page }) => {
		// 不在 path を持つ item を作成 → launchItem → preflight_check で LaunchFileNotFound
		const item = await createItem(page, {
			item_type: 'exe',
			label: 'Nonexistent App',
			target: 'Z:/__arcagate_e2e_nonexistent__/foo.exe',
		});

		try {
			const result = await invokeForError(page, 'cmd_launch_item', {
				itemId: item.id,
				source: 'palette',
			});
			expect(result.ok).toBe(false);
			if (!result.ok) {
				// AppError::LaunchFileNotFound を期待 (PH-429 structured error)
				expect(
					result.code === 'launch.file_not_found' || result.message.includes('File not found'),
				).toBe(true);
			}
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
			const result = await invokeForError(page, 'cmd_launch_item', {
				itemId: item.id,
				source: 'palette',
			});
			expect(result.ok).toBe(false);
			if (!result.ok) {
				// AppError::LaunchNotExecutable を期待
				expect(
					result.code === 'launch.not_executable' || result.message.includes('Not executable'),
				).toBe(true);
			}
		} finally {
			await deleteItem(page, item.id);
		}
	});
});
