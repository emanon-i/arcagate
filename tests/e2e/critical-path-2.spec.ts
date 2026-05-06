import { expect, test } from '../fixtures/tauri.js';
import {
	createItem,
	deleteItem,
	getLibraryStats,
	getTags,
	listItems,
	searchItems,
	updateItem,
} from '../helpers/ipc.js';

/**
 * T2-2 critical path (5 件 minimal): item update / library stats / tags / search IPC + selection UI。
 *
 * 引用元: docs/l1_requirements/test-rebuild/index.md (T2 phase、第 2 弾)
 *
 * 設計方針:
 * - SetupWizard 復活問題回避のため createWorkspace / deleteWorkspace を使わず、
 *   IPC 系 4 + UI 系 1 件で構成
 * - 各 spec は IPC 経由で setup + 自前 cleanup (test isolation)
 * - 唯一 UI 系 (selection mode) は library 画面の click 1 回のみ、reload 不要
 */
test('T2-2-1: updateItem IPC で label 変更 → listItems に反映', async ({ page }) => {
	const created = await createItem(page, {
		item_type: 'url',
		label: 'T2-2 update target',
		target: 'https://example.com/t2-2-update',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});

	const updated = await updateItem(page, created.id, { label: 'T2-2 updated label' });
	expect(updated.label).toBe('T2-2 updated label');

	// listItems で反映確認
	const items = await listItems(page);
	const found = items.find((i) => i.id === created.id);
	expect(found?.label).toBe('T2-2 updated label');

	// cleanup
	await deleteItem(page, created.id);
});

test('T2-2-2: getLibraryStats IPC → response shape 確認', async ({ page }) => {
	const stats = await getLibraryStats(page);
	expect(typeof stats.total_items).toBe('number');
	expect(typeof stats.total_tags).toBe('number');
	expect(typeof stats.recent_launch_count).toBe('number');
	// 値は 0 以上 (initial state なら 0、既存データあれば > 0)
	expect(stats.total_items).toBeGreaterThanOrEqual(0);
	expect(stats.total_tags).toBeGreaterThanOrEqual(0);
});

test('T2-2-3: getTags IPC → array of system + user tags', async ({ page }) => {
	const tags = await getTags(page);
	expect(Array.isArray(tags)).toBe(true);
	// system tag (sys-starred 等) が少なくとも 1 件存在 (initial seed)
	const systemTags = tags.filter((t) => t.is_system);
	expect(systemTags.length).toBeGreaterThanOrEqual(1);
	// 各 tag は id / name / is_system を持つ
	for (const t of tags) {
		expect(typeof t.id).toBe('string');
		expect(typeof t.name).toBe('string');
		expect(typeof t.is_system).toBe('boolean');
	}
});

test('T2-2-4: searchItems IPC で query → filter', async ({ page }) => {
	const created = await createItem(page, {
		item_type: 'url',
		label: 'UniqueT2_2SearchTarget',
		target: 'https://example.com/t2-2-search',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});

	const results = await searchItems(page, 'UniqueT2_2');
	expect(results.length).toBeGreaterThanOrEqual(1);
	expect(results.find((i) => i.id === created.id)).toBeTruthy();

	// no-match で空配列
	const noResults = await searchItems(page, 'NonExistentXYZ12345');
	expect(noResults.length).toBe(0);

	// cleanup
	await deleteItem(page, created.id);
});

test('T2-2-5: selection mode toggle → button text 変化 (UI のみ)', async ({ page }) => {
	// default 画面 = library、selection toggle button が visible
	const toggleBtn = page.getByTestId('library-selection-toggle');
	await expect(toggleBtn).toBeVisible({ timeout: 15_000 });
	await expect(toggleBtn).toContainText('複数選択');

	// click → text 「選択解除」 に変わる
	await toggleBtn.click();
	await expect(toggleBtn).toContainText('選択解除');

	// もう 1 回 click → 「複数選択」 に戻る
	await toggleBtn.click();
	await expect(toggleBtn).toContainText('複数選択');
});
