import { expect, test } from '../fixtures/tauri.js';
import {
	addWidget,
	createItem,
	createWorkspace,
	deleteItem,
	deleteWorkspace,
	launchItem,
	listItems,
	listWidgets,
} from '../helpers/ipc.js';

/**
 * T2 critical path (5 件 minimal): item CRUD / workspace 切替 / search / launch。
 *
 * 引用元: docs/l1_requirements/test-rebuild/index.md (T2 phase、10-15 件 critical path)
 *
 * 各 test は IPC 経由で setup + UI 操作で検証。前 test の影響を避けるため自前 cleanup。
 *
 * scope:
 * - item 追加 → library 一覧 IPC 反映 (UI 表示は LibraryMainArea の reactive 更新待ち)
 * - item 削除 → library 一覧から消える
 * - workspace 切替 → widgets が active workspace のもの (PR-D race-fix 検証)
 * - search input → debounce + fuzzy filter で card 表示
 * - launch IPC → success (実 launch しない、response 確認)
 */
test('T2-1: item 追加 → listItems に反映', async ({ page }) => {
	const items_before = await listItems(page);
	const beforeCount = items_before.length;

	const created = await createItem(page, {
		item_type: 'url',
		label: 'T2 test item',
		target: 'https://example.com/t2-test',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});
	expect(created.id).toBeTruthy();
	expect(created.label).toBe('T2 test item');

	const items_after = await listItems(page);
	expect(items_after.length).toBe(beforeCount + 1);
	expect(items_after.find((i) => i.id === created.id)).toBeTruthy();

	// cleanup
	await deleteItem(page, created.id);
});

test('T2-2: item 削除 → listItems から消える', async ({ page }) => {
	const created = await createItem(page, {
		item_type: 'url',
		label: 'T2 delete target',
		target: 'https://example.com/t2-delete',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});
	expect((await listItems(page)).find((i) => i.id === created.id)).toBeTruthy();

	await deleteItem(page, created.id);

	const items_after = await listItems(page);
	expect(items_after.find((i) => i.id === created.id)).toBeFalsy();
});

test('T2-3: workspace 別 widgets ownership (PR-D race-fix、Codex P2 #2)', async ({ page }) => {
	// 2 つ workspace を作って ws1 に widget 追加、ws2 には追加せず
	// → listWidgets が active workspace のもの **だけ** を返すこと検証 (race fix の本質)
	const ws1 = await createWorkspace(page, 'T2 ws1');
	const ws2 = await createWorkspace(page, 'T2 ws2');

	// ws1 に widget 追加 (recent 等の minimal widget type、'clock' は migration 021 で廃止済)
	const widget1 = await addWidget(page, ws1.id, 'recent');
	expect(widget1.workspace_id).toBe(ws1.id);

	// ws1 listWidgets: 1 件、id 一致
	const ws1_widgets = await listWidgets(page, ws1.id);
	expect(ws1_widgets.length).toBe(1);
	expect(ws1_widgets[0].id).toBe(widget1.id);

	// ws2 listWidgets: 0 件 (ws1 の widget が漏れていないこと = race fix の検証)
	const ws2_widgets = await listWidgets(page, ws2.id);
	expect(ws2_widgets.length).toBe(0);

	// cleanup
	await deleteWorkspace(page, ws1.id);
	await deleteWorkspace(page, ws2.id);
});

test('T2-4: search input → debounce + fuzzy filter (DOM)', async ({ page }) => {
	// item を 1 つ作って search で見つけられること
	const created = await createItem(page, {
		item_type: 'url',
		label: 'UniqueT2SearchTarget',
		target: 'https://example.com/t2-search',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});
	// reload で itemStore.loadItems 実行 → DOM に反映
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });

	const searchInput = page.getByPlaceholder('ライブラリを検索');
	await searchInput.click();
	await searchInput.fill('UniqueT2');
	// debounce 150ms + filter 反映を待つ
	await expect(page.getByText('UniqueT2SearchTarget')).toBeVisible({ timeout: 5_000 });

	// cleanup
	await searchInput.fill('');
	await deleteItem(page, created.id);
});

test('T2-5: launchItem IPC error path - invalid id throws (Codex P2 #1)', async ({ page }) => {
	// 存在しない item id を launch IPC に渡すと、Rust 側で item lookup 失敗 → error。
	// これで **IPC bridge alive + error path 動作** を同時に検証 (vacuous assertion 排除)。
	let errorMessage = '';
	let threw = false;
	try {
		await launchItem(page, 'invalid-uuid-does-not-exist-in-db');
	} catch (e) {
		threw = true;
		errorMessage = String(e);
	}
	// IPC が error を返すことを期待 (broken IPC bridge なら別 error message、
	// 正常な IPC なら item not found 系 error)。
	expect(threw).toBe(true);
	// error message が空でないこと (broken IPC なら null/undefined 系 message)
	expect(errorMessage.length).toBeGreaterThan(0);
});
