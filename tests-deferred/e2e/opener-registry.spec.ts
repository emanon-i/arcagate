/**
 * PH-issue-024 / 検収項目 #28: Opener registry E2E.
 *
 * カバレッジ:
 * 1. Settings > Openers section に builtin 5 件 (Explorer / VSCode / WT / PowerShell / Cmd) が表示される
 * 2. cmd_list_openers IPC で builtin が返る
 * 3. cmd_save_opener / cmd_delete_opener で custom CRUD が動作する
 * 4. cmd_save_opener が builtin id 編集 / placeholder 欠落を弾く
 *
 * 注意: 実際にプロセス起動を確認する E2E は OS-level (`code` / `wt`) の存在に依存するため
 * IPC レベルの round-trip + UI 表示確認に留める。
 */
import { expect, test } from '../fixtures/tauri.js';
import { invoke } from '../helpers/ipc.js';

interface Opener {
	id: string;
	name: string;
	command_template: string;
	is_builtin: boolean;
	sort_order: number;
}

test.describe('Opener registry', () => {
	// Settings ダイアログを開くテストがあるため確実に閉じる
	test.afterEach(async ({ page }) => {
		const closeBtn = page.getByRole('button', { name: '設定を閉じる' });
		if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
			await closeBtn.click();
		}
	});

	test('builtin 5 件が cmd_list_openers で返ること', async ({ page }) => {
		const openers = await invoke<Opener[]>(page, 'cmd_list_openers');
		const builtins = openers.filter((o) => o.is_builtin);
		expect(builtins.length).toBe(5);
		const ids = builtins.map((o) => o.id).sort();
		expect(ids).toEqual([
			'builtin:cmd',
			'builtin:explorer',
			'builtin:powershell',
			'builtin:vscode',
			'builtin:wt',
		]);
		// Explorer の template に <path> placeholder があること
		const explorer = builtins.find((o) => o.id === 'builtin:explorer');
		expect(explorer?.command_template).toContain('<path>');
	});

	test('custom opener の CRUD ができること', async ({ page }) => {
		const created = await invoke<Opener>(page, 'cmd_save_opener', {
			input: {
				id: null,
				name: 'E2E Test Opener',
				command_template: 'echo "<path>"',
				icon_path: null,
				sort_order: 99,
			},
		});
		try {
			expect(created.id.startsWith('user:')).toBe(true);
			expect(created.is_builtin).toBe(false);
			expect(created.name).toBe('E2E Test Opener');

			// list に出ること
			const all = await invoke<Opener[]>(page, 'cmd_list_openers');
			expect(all.find((o) => o.id === created.id)).toBeDefined();

			// 名前 update
			const updated = await invoke<Opener>(page, 'cmd_save_opener', {
				input: {
					id: created.id,
					name: 'E2E Test Opener (updated)',
					command_template: 'echo "<path>" --updated',
					icon_path: null,
					sort_order: 99,
				},
			});
			expect(updated.name).toBe('E2E Test Opener (updated)');
		} finally {
			// 後始末: 削除
			await invoke<void>(page, 'cmd_delete_opener', { id: created.id });
		}

		// 削除されたこと
		const after = await invoke<Opener[]>(page, 'cmd_list_openers');
		expect(after.find((o) => o.id === created.id)).toBeUndefined();
	});

	test('builtin の編集 / 削除を弾くこと', async ({ page }) => {
		// builtin id で save しようとすると InvalidInput
		await expect(
			invoke<Opener>(page, 'cmd_save_opener', {
				input: {
					id: 'builtin:vscode',
					name: 'Hacked',
					command_template: 'evil "<path>"',
					icon_path: null,
					sort_order: null,
				},
			}),
		).rejects.toThrow();

		// builtin の delete も InvalidInput
		await expect(
			invoke<void>(page, 'cmd_delete_opener', { id: 'builtin:vscode' }),
		).rejects.toThrow();
	});

	test('placeholder 欠落 / 名前空白を弾くこと', async ({ page }) => {
		// <path> 無し
		await expect(
			invoke<Opener>(page, 'cmd_save_opener', {
				input: {
					id: null,
					name: 'No Placeholder',
					command_template: 'notepad',
					icon_path: null,
					sort_order: null,
				},
			}),
		).rejects.toThrow();

		// 名前空白
		await expect(
			invoke<Opener>(page, 'cmd_save_opener', {
				input: {
					id: null,
					name: '   ',
					command_template: 'x "<path>"',
					icon_path: null,
					sort_order: null,
				},
			}),
		).rejects.toThrow();
	});

	test('Settings > ライブラリ に Openers section が表示されること', async ({ page }) => {
		// 設定パネルを開く
		await page.getByRole('button', { name: 'Settings' }).click();
		await expect(page.getByRole('dialog')).toBeVisible();
		// ライブラリ tab に切替
		const tablist = page.getByRole('tablist', { name: '設定カテゴリ' });
		await tablist.getByRole('tab', { name: 'ライブラリ' }).click();
		// OpenerSettings 表示
		const openerSettings = page.getByTestId('opener-settings');
		await expect(openerSettings).toBeVisible();
		// builtin 5 件が表示
		await expect(page.getByTestId('opener-item-builtin:explorer')).toBeVisible();
		await expect(page.getByTestId('opener-item-builtin:vscode')).toBeVisible();
		await expect(page.getByTestId('opener-item-builtin:wt')).toBeVisible();
		await expect(page.getByTestId('opener-item-builtin:powershell')).toBeVisible();
		await expect(page.getByTestId('opener-item-builtin:cmd')).toBeVisible();
	});
});
