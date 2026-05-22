import { expect, test } from '../../fixtures/tauri.js';
import { createItem, deleteItem, launchItem, listItems } from '../../helpers/ipc.js';

/**
 * PH-PQ-700 T7: EN locale critical path。
 *
 * globalSetup が ARCAGATE_E2E_LOCALE=en を読み、 UI を英語で強制起動する。
 * item CRUD は IPC 経由 (locale 非依存) だが、 search は EN placeholder を selector に使い
 * 「EN UI で実 UI 操作が成立する」 ことを検証する。
 *
 * 引用元: docs/l3_phases/paid-quality/PH-PQ-700_i18n-and-global.md T7
 */

test('EN-1: nav と library が英語表記で起動する', async ({ page }) => {
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });
	// nav は ja===en だが Library 検索 placeholder は EN value で表示されるはず
	await expect(page.getByPlaceholder('Search library')).toBeVisible({ timeout: 15_000 });
	await expect(page.getByRole('button', { name: 'Library', exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Workspace', exact: true })).toBeVisible();
});

test('EN-2: item 追加 → listItems に反映', async ({ page }) => {
	const before = (await listItems(page)).length;
	const created = await createItem(page, {
		item_type: 'url',
		label: 'EN test item',
		target: 'https://example.com/en-test',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});
	expect(created.id).toBeTruthy();

	const after = await listItems(page);
	expect(after.length).toBe(before + 1);
	expect(after.find((i) => i.id === created.id)).toBeTruthy();

	await deleteItem(page, created.id);
});

test('EN-3: search input → EN placeholder で filter が効く', async ({ page }) => {
	const created = await createItem(page, {
		item_type: 'url',
		label: 'UniqueEnSearchTarget',
		target: 'https://example.com/en-search',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });

	const searchInput = page.getByPlaceholder('Search library');
	await searchInput.click();
	await searchInput.fill('UniqueEn');
	await expect(page.getByText('UniqueEnSearchTarget')).toBeVisible({ timeout: 5_000 });

	await searchInput.fill('');
	await deleteItem(page, created.id);
});

test('EN-4: launchItem IPC error path - invalid id throws', async ({ page }) => {
	let threw = false;
	let errorMessage = '';
	try {
		await launchItem(page, 'invalid-uuid-does-not-exist-in-db');
	} catch (e) {
		threw = true;
		errorMessage = String(e);
	}
	expect(threw).toBe(true);
	expect(errorMessage.length).toBeGreaterThan(0);
});
