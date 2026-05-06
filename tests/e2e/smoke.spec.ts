import { expect, test } from '../fixtures/tauri.js';
import { listWorkspaces } from '../helpers/ipc.js';

/**
 * T1 smoke: アプリ起動 / 主画面 render / 基本 IPC pass の garde-fou。
 *
 * 引用元: docs/l1_requirements/test-rebuild/index.md (T1 phase、5-10 件 smoke)
 *
 * fixture (page) は data-il-zone visible まで待機する設計のため、各 test 開始時点で
 * App orchestrator は ready 状態にある。
 *
 * default activeView は 'library' (src/routes/+page.svelte:36)。
 * top nav は library / workspace の 2 タブ (TitleTab、英語 label)。
 * settings は TitleAction (左上、aria-label='Settings') から modal で開く。
 */
test('app startup: data-il-zone renders', async ({ page }) => {
	// fixture で data-il-zone visible 待機済 → 既に visible
	await expect(page.locator('[data-il-zone]').first()).toBeVisible();
});

test('library view: default で表示 + search bar renders', async ({ page }) => {
	// default activeView = 'library' なので nav click 不要
	await expect(page.getByRole('region', { name: 'ライブラリ' })).toBeVisible({ timeout: 15_000 });
	await expect(page.getByPlaceholder('ライブラリを検索')).toBeVisible();
});

test('workspace view: nav 切替後 canvas-toolbar renders', async ({ page }) => {
	// top nav: TitleTab "Workspace" (英語 label) を click
	await page.getByRole('button', { name: 'Workspace', exact: true }).click();
	// WorkspaceLayout の右下 canvas-toolbar (Undo/Redo/zoom) が出る
	await expect(page.getByTestId('canvas-toolbar')).toBeVisible({ timeout: 15_000 });
});

test('settings modal: 開閉 + category tablist renders', async ({ page }) => {
	// TitleAction "Settings" (英語 aria-label) を click → modal 開く
	await page.getByRole('button', { name: 'Settings', exact: true }).click();
	// SettingsPanel の category tablist
	await expect(page.getByRole('tablist', { name: '設定カテゴリ' })).toBeVisible({
		timeout: 15_000,
	});
});

test('basic IPC: listWorkspaces returns >= 1 (Home auto-create)', async ({ page }) => {
	// fixture で data-il-zone visible まで待機済 → workspaceStore.loadWorkspaces 完了済想定
	const workspaces = await listWorkspaces(page);
	expect(Array.isArray(workspaces)).toBe(true);
	// globalSetup で初回起動済、Home workspace auto-create で 1 件以上
	expect(workspaces.length).toBeGreaterThanOrEqual(1);
});
