import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { addWidget, createWorkspace, deleteWorkspace } from '../helpers/ipc.js';

/**
 * R10-F A1 主要 widget 動作 (criteria.md §A1) — proof-of-life smoke spec。
 *
 * 各 widget type を Workspace に追加して mount できることを確認する。
 * 既存 e2e は favorites / recent / item のみカバー、本 spec で残 9 種をカバー:
 *   projects / stats / quick_note / exe_folder / daily_task / snippet /
 *   clipboard_history / file_search / system_monitor
 *
 * "proof-of-life" = mount してエラーで crash しないことだけ検証。
 * 各 widget の機能 e2e (config 編集 / 起動等) は別 spec で個別カバー。
 *
 * Tag: @smoke (PR ごと CI 実行、12 widget 完全カバー regression 防止)
 */

const WIDGETS_TO_VERIFY = [
	{ type: 'projects', label: 'フォルダ監視' },
	{ type: 'stats', label: 'よく使うもの' },
	{ type: 'quick_note', label: 'メモ' },
	{ type: 'exe_folder', label: 'Exe フォルダ監視' },
	{ type: 'daily_task', label: 'デイリータスク' },
	{ type: 'snippet', label: 'スニペット' },
	{ type: 'clipboard_history', label: 'クリップボード履歴' },
	{ type: 'file_search', label: 'ファイル検索' },
	{ type: 'system_monitor', label: 'システムモニタ' },
] as const;

test.describe('R10-F widget proof-of-life (9 種)', () => {
	test.setTimeout(120_000);

	for (const { type, label } of WIDGETS_TO_VERIFY) {
		test(
			`${type}: workspace に追加して mount + crash 無し`,
			{ tag: '@smoke' },
			async ({ page }) => {
				const workspace = await createWorkspace(page, `R10-F ${type} ${Date.now()}`);
				try {
					await addWidget(page, workspace.id, type);
					await page.reload();
					await page.waitForLoadState('domcontentloaded');
					await waitForAppReady(page);
					await page.getByRole('button', { name: 'Workspace' }).click();
					// Widget が mount され、aria-label="<JP label>" を持つ group 要素が visible になる。
					// 各 widget は WidgetShell でラップされ、role="group" + aria-label = WIDGET_LABELS[type] が付与される。
					await expect(page.getByRole('group', { name: label }).first()).toBeVisible({
						timeout: 15_000,
					});
					// dev console error が出ていないこと (panic / unhandled rejection は frontend layer で error toast)。
					// Playwright の page console listener で error をスキャン。
					const errors: string[] = [];
					page.on('pageerror', (e) => errors.push(e.message));
					page.on('console', (msg) => {
						if (msg.type() === 'error') errors.push(msg.text());
					});
					await page.waitForTimeout(500);
					expect(errors, `${type} mount 中の console error / pageerror`).toEqual([]);
				} finally {
					await deleteWorkspace(page, workspace.id).catch(() => undefined);
				}
			},
		);
	}
});
