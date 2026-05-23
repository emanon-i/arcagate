import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/tauri.js';
import { getLibraryWallpaper, setLibraryWallpaper } from '../helpers/ipc.js';

/**
 * PH-CF-700 e2e: ライブラリ画面 UX + 背景の実機検証。
 *
 * 引用元 guideline:
 * - `docs/l3_phases/clean-feedback/PH-CF-700_library-ux-wallpaper.md` §受け入れ条件 (機械検出)
 * - `docs/l2_foundation/features/screens/library.md` §ツールバー契約 / §サイドバーアイコン契約
 * - `docs/l2_foundation/features/backend/wallpaper-service.md` §壁紙格納先契約
 *
 * scope:
 * - LB-5 (C5): ツールバーで「複数選択トグル → アイテム追加」 の順、 追加が最右、
 *   複数選択トグルが aria-label + aria-pressed のアイコンボタン
 * - LB-6 (C6): サイドバーが mount され、 タグ row に「workspace アイコン」 が直接 fallback
 *   されていない (audit script で grep 検知済のため、 e2e では smoke 確認のみ)
 * - LB-8a (C8): `setLibraryWallpaper` (IPC) → ライブラリ画面に `library-wallpaper` レイヤーが
 *   表示される、 opacity / blur が style に反映される
 * - LB-8b (C8): page.reload() 後も `getLibraryWallpaper` が値を維持し、 LibraryLayout が
 *   再描画でも background を出す (= config table 永続)
 * - LB-8c (C8): `setLibraryWallpaper({ path: null })` で wallpaper レイヤーが消える (clear)
 */

// 個人情報を含まない generic placeholder path (audit-personal-data の `C:\Users\<name>\` /
// `AppData/Roaming/` pattern に hit しないよう placeholder で組み立てる)。 wallpaper IPC は
// path 文字列を config table にそのまま保存するだけで、 実 file の存在チェックはしない
// (実 file 検証は workspace 壁紙の `save_wallpaper_file` 側で完結し、 本 e2e は scope 外)。
const appDataDir = '<app-data-dir>';

async function openLibrary(page: Page): Promise<void> {
	await page.evaluate(() => localStorage.setItem('arcagate.app.activeView', 'library'));
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });
}

test.afterEach(async ({ page }) => {
	// 他 spec の Library 画面に影響しないよう wallpaper を確実に解除する。
	if (!page.isClosed()) {
		try {
			await setLibraryWallpaper(page, { path: null, opacity: 0.6, blur: 0 });
		} catch {
			// best-effort cleanup
		}
	}
});

test('LB-5: ツールバーで [複数選択] → [アイテム追加] の順、 追加が最右、 複数選択はアイコンボタン', async ({
	page,
}, testInfo) => {
	await openLibrary(page);

	const addBtn = page.getByTestId('add-item-button');
	const selectionToggle = page.getByTestId('library-selection-toggle');
	await addBtn.waitFor({ state: 'visible', timeout: 15_000 });
	await selectionToggle.waitFor({ state: 'visible', timeout: 5_000 });

	// DOM 順 = visual 順を確認。 ツールバー親要素から子要素を取得し、 selection-toggle が
	// add-item-button より前に並ぶこと (追加が最右) を index 比較で verify。
	const order = await page.evaluate(() => {
		const sel = document.querySelector('[data-testid="library-selection-toggle"]');
		const add = document.querySelector('[data-testid="add-item-button"]');
		if (!sel || !add) return null;
		const parent = sel.parentElement;
		if (!parent || add.parentElement !== parent) return { sameParent: false };
		const children = Array.from(parent.children);
		return {
			sameParent: true,
			selIndex: children.indexOf(sel),
			addIndex: children.indexOf(add),
			lastChildTestId: (children[children.length - 1] as HTMLElement | undefined)?.getAttribute(
				'data-testid',
			),
		};
	});
	expect(order).not.toBeNull();
	expect(order?.sameParent).toBe(true);
	expect(order?.selIndex).toBeLessThan(order?.addIndex ?? -1);
	expect(order?.lastChildTestId).toBe('add-item-button');

	// 複数選択トグルはアイコンボタン (テキスト無し、 aria-label + aria-pressed あり)。
	const ariaLabel = await selectionToggle.getAttribute('aria-label');
	expect(ariaLabel, 'selection toggle must have aria-label').not.toBeNull();
	expect(ariaLabel?.length ?? 0).toBeGreaterThan(0);
	const ariaPressed = await selectionToggle.getAttribute('aria-pressed');
	expect(ariaPressed === 'true' || ariaPressed === 'false').toBe(true);
	// ボタン内に <svg> (lucide icon) があり、 直接のテキストは持たない (icon-only)。
	const hasSvg = await selectionToggle.locator('svg').count();
	expect(hasSvg).toBeGreaterThan(0);
	const innerText = (await selectionToggle.innerText()).trim();
	expect(innerText).toBe('');

	await testInfo.attach('lb-5-toolbar-order.png', {
		body: await page.screenshot({ fullPage: false }),
		contentType: 'image/png',
	});
});

test('LB-6: ライブラリサイドバーが mount される (workspace アイコン fallback 撤去の smoke)', async ({
	page,
}) => {
	// 撤去自体は `scripts/audit-library-sidebar-icons.sh` (audit:all) で grep gate するため、
	// 本 e2e では「sidebar が依然として render される」 (= 既存 section 構造に regression が無い)
	// 程度の smoke 確認のみ。 sidebar wrapper / アイテム全体 wrapper が visible。
	await openLibrary(page);
	const sidebar = page.getByTestId('library-sidebar');
	await expect(sidebar).toBeVisible({ timeout: 15_000 });
	// セクション 1 (ライブラリ全体) は常に存在する。
	const allSection = sidebar.getByTestId('sidebar-section-all');
	await expect(allSection).toBeVisible();
});

test('LB-8a: setLibraryWallpaper → library-wallpaper レイヤーが描画される (opacity/blur 反映)', async ({
	page,
}, testInfo) => {
	// 1) まず壁紙未設定で開き、 library-wallpaper レイヤーが居ない (= 描画されない) ことを確認。
	await openLibrary(page);
	await expect(page.getByTestId('library-wallpaper')).toHaveCount(0);

	// 2) IPC 直叩きで wallpaper path を設定。 実 image file は不要 (asset:// 経由で url を組み立てる
	// だけなので、 frontend の `<img src>` 検証としては path 文字列が style に入ること + element が
	// 出現することで十分)。 opacity 0.5 / blur 12 を期待値として渡す。
	const fakePath = `${appDataDir}/wallpapers/ph-cf-700-${Date.now()}.png`;
	const applied = await setLibraryWallpaper(page, {
		path: fakePath,
		opacity: 0.5,
		blur: 12,
	});
	expect(applied.opacity).toBeCloseTo(0.5);
	expect(applied.blur).toBe(12);

	// 3) library-wallpaper レイヤーが出現するまで store 反映を poll。
	//    現状 LibraryLayout は mount 時に 1 度だけ load しているため、 IPC 後に store 反映を
	//    強制するため再 mount (= openLibrary 経由 reload) を 1 度かける。 「再起動相当」 経路で
	//    確実に load する。 store の reactive 再 fetch は実装範囲外 (Settings UI 経由でユーザー
	//    操作した場合は同 store に書き戻されるため reload 不要)。
	await openLibrary(page);
	const layer = page.getByTestId('library-wallpaper');
	await expect(layer).toBeVisible({ timeout: 5_000 });

	// 4) inline style に opacity / blur / background-image (path 末尾) が反映されている。
	const style = (await layer.getAttribute('style')) ?? '';
	expect(style).toContain('opacity: 0.5');
	expect(style).toContain('blur(12px)');
	// asset:// で encode されるため path 末尾 (filename) だけ含まれるかを部分一致で確認。
	const fakeFile = fakePath.split('/').pop() ?? fakePath;
	expect(style).toContain(fakeFile);

	await testInfo.attach('lb-8a-wallpaper-on.png', {
		body: await page.screenshot({ fullPage: false }),
		contentType: 'image/png',
	});
});

test('LB-8b: アプリ再起動 (page.reload) 後も library wallpaper の値が保持される', async ({
	page,
}) => {
	const fakePath = `${appDataDir}/wallpapers/ph-cf-700-persist-${Date.now()}.png`;
	await setLibraryWallpaper(page, { path: fakePath, opacity: 0.7, blur: 5 });

	// page.reload() で frontend を再 mount し、 LibraryLayout の onMount で再 load される。
	await openLibrary(page);
	const layer = page.getByTestId('library-wallpaper');
	await expect(layer).toBeVisible({ timeout: 5_000 });

	// backend からも同じ値が読めることを直接 verify (config table 永続)。
	const persisted = await getLibraryWallpaper(page);
	expect(persisted.path).toBe(fakePath);
	expect(persisted.opacity).toBeCloseTo(0.7);
	expect(persisted.blur).toBe(5);
});

test('LB-8c: setLibraryWallpaper({ path: null }) で wallpaper レイヤーが消える', async ({
	page,
}) => {
	const fakePath = `${appDataDir}/wallpapers/ph-cf-700-clear-${Date.now()}.png`;
	await setLibraryWallpaper(page, { path: fakePath, opacity: 0.6, blur: 0 });

	await openLibrary(page);
	await expect(page.getByTestId('library-wallpaper')).toBeVisible({ timeout: 5_000 });

	// path=null で clear → 再 mount 経由でレイヤーが居なくなる。
	await setLibraryWallpaper(page, { path: null, opacity: 0.6, blur: 0 });
	await openLibrary(page);
	await expect(page.getByTestId('library-wallpaper')).toHaveCount(0);

	const persisted = await getLibraryWallpaper(page);
	expect(persisted.path).toBeNull();
});
