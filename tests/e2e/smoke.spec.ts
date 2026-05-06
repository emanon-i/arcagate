import { expect, test } from '../fixtures/tauri.js';
import { listWorkspaces } from '../helpers/ipc.js';

/**
 * T1 smoke: アプリ起動 / 主画面 render / 基本 IPC pass の garde-fou。
 *
 * 引用元: docs/l1_requirements/test-rebuild/index.md (T1 phase、5-10 件 smoke)
 *
 * 含めるもの:
 * - アプリ起動 → main page render
 * - workspace / library / settings 画面の主要要素 render
 * - 基本 IPC (listWorkspaces) success
 * - palette open (Ctrl+Shift+Space hotkey)
 *
 * 含めないもの: 詳細機能テスト (T2 critical path に委ねる)
 */
test('app startup: main page renders', async ({ page }) => {
	// SetupWizard / Onboarding は globalSetup で skip 済、main UI が見える
	await expect(page.locator('body')).toBeVisible();
	await expect(page.locator('[data-il-zone], main, [role="main"]').first()).toBeVisible({
		timeout: 15_000,
	});
});

test('workspace view: canvas renders', async ({ page }) => {
	// nav から workspace を開く (default で workspace ?)、canvas-toolbar (Undo/Redo/zoom) が出る
	await expect(page.getByTestId('canvas-toolbar')).toBeVisible({ timeout: 15_000 });
});

test('library view: navigate + search bar renders', async ({ page }) => {
	// library nav button click
	const libraryNav = page.getByRole('button', { name: 'ライブラリ', exact: true });
	if (await libraryNav.isVisible({ timeout: 5_000 })) {
		await libraryNav.click();
	}
	// section[aria-label="ライブラリ"] + search input
	await expect(page.getByRole('region', { name: 'ライブラリ' })).toBeVisible({ timeout: 15_000 });
	await expect(page.getByPlaceholder('ライブラリを検索')).toBeVisible();
});

test('settings view: navigate + category nav renders', async ({ page }) => {
	const settingsNav = page.getByRole('button', { name: '設定', exact: true });
	if (await settingsNav.isVisible({ timeout: 5_000 })) {
		await settingsNav.click();
	}
	// settings tablist + general tab
	await expect(page.getByRole('tablist', { name: '設定カテゴリ' })).toBeVisible({
		timeout: 15_000,
	});
});

test('basic IPC: listWorkspaces returns array', async ({ page }) => {
	const workspaces = await listWorkspaces(page);
	expect(Array.isArray(workspaces)).toBe(true);
	// 初回起動 / globalSetup で Home workspace が auto-create されてる想定で 1 件以上
	expect(workspaces.length).toBeGreaterThanOrEqual(1);
});
