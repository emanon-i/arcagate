import { expect, test } from '../fixtures/tauri.js';
import {
	createItem,
	deleteItem,
	searchItemsInTag,
	toggleStar,
	updateItem,
} from '../helpers/ipc.js';

/**
 * PH-CF-600 e2e: Library 画面 バグ修正の実機検証。
 *
 * 引用元 guideline:
 * - `docs/l3_phases/clean-feedback/PH-CF-600_library-bug-fixes.md` §受け入れ条件 (機械検出)
 * - `docs/l2_foundation/features/screens/library.md` §hidden 表示契約 / §detail panel 閉じ条件契約
 * - `docs/l2_foundation/features/backend/item-service.md` §hidden item 取得契約
 *
 * scope:
 * - LB-4a (C4): `searchItemsInTag(tag, '', includeDisabled=true)` で hidden item を含む
 * - LB-4b (C4): `searchItemsInTag(tag, '', includeDisabled=false)` で hidden item は除外
 * - LB-4c (C4): favorites widget の `searchItemsInTag('sys-starred', '')` (default = false)
 *   は hidden starred を含まない (call-site matrix の不変条件)
 * - LB-7a (C7): detail panel 表示中、 検索バー click で panel が閉じない
 * - LB-7b (C7): detail panel 表示中、 sort select click で panel が閉じない
 * - LB-7c (C7): detail panel 表示中、 余白クリックで panel が閉じる
 *
 * 注: C2 (画像即時反映) は Tauri `dialog.open` で OS file picker を開く path のため、
 * 実機 e2e で reproduce するには file picker mock が必要。 本 spec は IPC レイヤと UI
 * close 条件に集中し、 C2 は Rust 側で store の即時更新 path (applyOptimisticUpdate) を
 * 通したことを ItemFormCardOverride の実装で確認する (`docs/l3_phases/clean-feedback/`
 * PH-CF-600 §C2 で plan の選択肢どおり)。
 */

async function openLibrary(page: import('@playwright/test').Page): Promise<void> {
	await page.evaluate(() => localStorage.setItem('arcagate.app.activeView', 'library'));
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });
}

test('LB-4a: searchItemsInTag(includeDisabled=true) は hidden item を含む', async ({ page }) => {
	const visible = await createItem(page, {
		item_type: 'url',
		label: `PH-CF-600 LB-4a visible ${Date.now()}`,
		target: 'https://example.com/ph-cf-600-lb-4a-visible',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});
	const hidden = await createItem(page, {
		item_type: 'url',
		label: `PH-CF-600 LB-4a hidden ${Date.now()}`,
		target: 'https://example.com/ph-cf-600-lb-4a-hidden',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});

	try {
		// hidden 化 (is_enabled = false)。 URL item の sys-type-url は create 時に自動付与。
		await updateItem(page, hidden.id, { is_enabled: false });

		// include_disabled=true: 両方含まれる
		const both = await searchItemsInTag(page, 'sys-type-url', '', true);
		expect(both.find((i) => i.id === visible.id)).toBeTruthy();
		expect(both.find((i) => i.id === hidden.id)).toBeTruthy();
	} finally {
		await deleteItem(page, visible.id).catch(() => {});
		await deleteItem(page, hidden.id).catch(() => {});
	}
});

test('LB-4b: searchItemsInTag(includeDisabled=false) は hidden item を除外', async ({ page }) => {
	const visible = await createItem(page, {
		item_type: 'url',
		label: `PH-CF-600 LB-4b visible ${Date.now()}`,
		target: 'https://example.com/ph-cf-600-lb-4b-visible',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});
	const hidden = await createItem(page, {
		item_type: 'url',
		label: `PH-CF-600 LB-4b hidden ${Date.now()}`,
		target: 'https://example.com/ph-cf-600-lb-4b-hidden',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});

	try {
		await updateItem(page, hidden.id, { is_enabled: false });

		// include_disabled=false (default 挙動): hidden 除外
		const visibleOnly = await searchItemsInTag(page, 'sys-type-url', '', false);
		expect(visibleOnly.find((i) => i.id === visible.id)).toBeTruthy();
		expect(visibleOnly.find((i) => i.id === hidden.id)).toBeFalsy();

		// 省略時 (undefined) も backend default = false で hidden 除外
		const omitted = await searchItemsInTag(page, 'sys-type-url', '');
		expect(omitted.find((i) => i.id === hidden.id)).toBeFalsy();
	} finally {
		await deleteItem(page, visible.id).catch(() => {});
		await deleteItem(page, hidden.id).catch(() => {});
	}
});

test('LB-4c: favorites 用 searchItemsInTag(sys-starred, default) は hidden を漏らさない', async ({
	page,
}) => {
	// 「hidden starred」 (= 隠しているがお気に入りに入った item) が favorites widget の
	// fetch 経路 (default include_disabled = false) で漏れないこと。 PH-CF-600 C4 の
	// Codex クロスチェックで指摘された不変条件。
	const item = await createItem(page, {
		item_type: 'url',
		label: `PH-CF-600 LB-4c hidden-starred ${Date.now()}`,
		target: 'https://example.com/ph-cf-600-lb-4c',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});

	try {
		await toggleStar(page, item.id, true);
		await updateItem(page, item.id, { is_enabled: false });

		// favorites widget が呼ぶ default パターン (= false 省略)。 hidden は漏らさない。
		const starredDefault = await searchItemsInTag(page, 'sys-starred', '');
		expect(starredDefault.find((i) => i.id === item.id)).toBeFalsy();

		// Library 画面が「非表示を表示」 ON 時に呼ぶ true 経路では hidden starred も含まれる
		// (Library grid 上で hidden starred カードに ★ badge を一致させるため)。
		const starredWithHidden = await searchItemsInTag(page, 'sys-starred', '', true);
		expect(starredWithHidden.find((i) => i.id === item.id)).toBeTruthy();
	} finally {
		await deleteItem(page, item.id).catch(() => {});
	}
});

test('LB-7: detail panel は検索バー / sort クリックで閉じない、 余白クリックで閉じる', async ({
	page,
}, testInfo) => {
	const item = await createItem(page, {
		item_type: 'url',
		label: `PH-CF-600 LB-7 ${Date.now()}`,
		target: 'https://example.com/ph-cf-600-lb-7',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});

	try {
		await openLibrary(page);

		const card = page.getByTestId(`library-card-${item.id}`);
		await card.waitFor({ state: 'visible', timeout: 15_000 });

		// card click で detail panel を開く。
		await card.scrollIntoViewIfNeeded();
		await card.click();

		// 検収観点: detail panel が表示される (LibraryDetailPanel の <aside>)。
		// 「placeholder」 (= 何も選択されていない時の表示) ではなく item label が出ること。
		const detailPanel = page.locator('aside').filter({ hasText: item.label }).first();
		await expect(detailPanel).toBeVisible({ timeout: 5_000 });

		// LB-7a: 検索バーを click。 panel は閉じない。
		const searchInput = page
			.getByTestId('library-search-input')
			.or(page.getByPlaceholder(/search|検索/i));
		await searchInput.first().click();
		await expect(detailPanel).toBeVisible();

		// LB-7b: sort select を click。 panel は閉じない。
		const sortControl = page
			.getByTestId('library-sort-field')
			.or(page.locator('select').filter({ hasText: /name|created|launch|名前|起動|作成|更新/i }));
		if (await sortControl.first().count()) {
			await sortControl.first().click();
			await expect(detailPanel).toBeVisible();
			// select を閉じる (Escape で blur)。
			await page.keyboard.press('Escape');
		}

		await testInfo.attach('lb-7-detail-after-controls.png', {
			body: await page.screenshot({ fullPage: false }),
			contentType: 'image/png',
		});

		// LB-7c: 余白 (library-blank-area の padding 領域) を click → panel が閉じる。
		// 余白は左上の安全マージン (5px) を狙う。 card や sticky bar の上には乗らない位置。
		const blank = page.getByTestId('library-blank-area');
		await blank.click({ position: { x: 5, y: 5 } });
		await expect(detailPanel).not.toBeVisible({ timeout: 5_000 });
	} finally {
		await deleteItem(page, item.id).catch(() => {});
	}
});
