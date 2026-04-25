import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { createItem, deleteItem, invoke } from '../helpers/ipc.js';
import { resizeWindow } from '../helpers/resize.js';

/**
 * Library カード仕様 E2E（PH-20260425-283）
 *
 * 検証対象:
 *  - 4:3 アスペクト比固定
 *  - S/M/L 切替で width × height がカード全体で変動
 *  - gap が S/M/L で 16px 固定
 *  - ウィンドウ resize で列数のみ変動・カード幅不変
 *  - 背景モード切替（image/fill/none）
 *  - focal point スライダーで object-position が反映
 *
 * 仕様 source: project_library_card_spec.md / PH-280〜282 受け入れ条件。
 */

const CARD_WIDTHS = { S: 144, M: 192, L: 256 } as const;

async function setItemSize(page: import('@playwright/test').Page, size: 'S' | 'M' | 'L') {
	await invoke<void>(page, 'cmd_set_config', { key: 'item_size', value: size });
}

async function setLibraryCardConfig(
	page: import('@playwright/test').Page,
	patch: Record<string, unknown>,
) {
	await page.evaluate((p) => {
		const raw = localStorage.getItem('arcagate-library-card');
		const current = raw ? JSON.parse(raw) : {};
		localStorage.setItem('arcagate-library-card', JSON.stringify({ ...current, ...p }));
	}, patch);
}

test.describe('Library カード仕様（PH-20260425-280〜282）', () => {
	let createdItemIds: string[] = [];

	test.beforeEach(async ({ page }) => {
		await resizeWindow(page, 1280, 800);
		// LibraryCard image モードを使うため icon_path 付きで作成すると CDP では画像ロードに失敗する。
		// fill モードに固定して仕様検証する（4:3 aspect / size 切替は背景モード非依存）
		await setLibraryCardConfig(page, {
			background: {
				mode: 'fill',
				fillBgColor: '#1f2937',
				fillIconColor: '#ffffff',
				focalX: 50,
				focalY: 50,
			},
			style: {
				textColor: '#ffffff',
				strokeEnabled: true,
				strokeColor: '#000000',
				strokeWidthPx: 0.5,
				overlayEnabled: true,
			},
		});
		const item = await createItem(page, {
			item_type: 'url',
			label: 'card-spec-test-item',
			target: 'https://card-spec.example.com',
		});
		createdItemIds.push(item.id);
	});

	test.afterEach(async ({ page }) => {
		for (const id of createdItemIds) {
			await deleteItem(page, id).catch(() => {});
		}
		createdItemIds = [];
	});

	test('LibraryCard は 4:3 アスペクト比で表示される', { tag: '@smoke' }, async ({ page }) => {
		await setItemSize(page, 'M');
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await waitForAppReady(page);

		const card = page.locator('.library-card').first();
		await expect(card).toBeVisible();
		const { w, h } = await card.evaluate((el) => {
			const r = el.getBoundingClientRect();
			return { w: r.width, h: r.height };
		});
		expect(w / h).toBeCloseTo(4 / 3, 2);
	});

	test(
		'S/M/L 切替で LibraryCard の width が仕様通り変動する',
		{ tag: '@smoke' },
		async ({ page }) => {
			for (const size of ['S', 'M', 'L'] as const) {
				await setItemSize(page, size);
				await page.reload();
				await page.waitForLoadState('domcontentloaded');
				await waitForAppReady(page);

				const card = page.locator('.library-card').first();
				await expect(card).toBeVisible();
				const w = await card.evaluate((el) => el.getBoundingClientRect().width);
				expect(w).toBeCloseTo(CARD_WIDTHS[size], 0);
			}
		},
	);

	test('LibraryGrid gap は S/M/L で 16px 固定', async ({ page }) => {
		for (const size of ['S', 'M', 'L'] as const) {
			await setItemSize(page, size);
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			const grid = page.locator('.library-grid');
			await expect(grid).toBeVisible();
			const gap = await grid.evaluate((el) => {
				const cs = getComputedStyle(el);
				return { row: cs.rowGap, col: cs.columnGap };
			});
			expect(gap.row).toBe('16px');
			expect(gap.col).toBe('16px');
		}
	});

	test('window resize でカード幅は不変、列数のみ変動', async ({ page }) => {
		await setItemSize(page, 'M');

		await resizeWindow(page, 800, 600);
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await waitForAppReady(page);

		const card = page.locator('.library-card').first();
		await expect(card).toBeVisible();
		const w800 = await card.evaluate((el) => el.getBoundingClientRect().width);

		await resizeWindow(page, 1600, 900);
		// resize は CSS reflow が必要なので少し待つ
		await page.waitForFunction(() => window.innerWidth >= 1500, { timeout: 5000 });
		const w1600 = await card.evaluate((el) => el.getBoundingClientRect().width);

		expect(w1600).toBeCloseTo(w800, 0);
		expect(w1600).toBeCloseTo(CARD_WIDTHS.M, 0);
	});

	test('背景モード切替で DOM 構造が変わる（fill ↔ none）', async ({ page }) => {
		await setItemSize(page, 'M');

		// fill: 背景色 div が背景レイヤー
		await setLibraryCardConfig(page, {
			background: {
				mode: 'fill',
				fillBgColor: '#ff0000',
				fillIconColor: '#ffffff',
				focalX: 50,
				focalY: 50,
			},
		});
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await waitForAppReady(page);

		let card = page.locator('.library-card').first();
		await expect(card).toBeVisible();
		const fillBgColor = await card.evaluate((el) => {
			const layer = el.querySelector(':scope > div[style*="background"]');
			if (!layer) return '';
			return getComputedStyle(layer as HTMLElement).backgroundColor;
		});
		expect(fillBgColor).toMatch(/rgb\(\s*255,\s*0,\s*0\s*\)/);

		// none: artMap グラデが背景
		await setLibraryCardConfig(page, {
			background: {
				mode: 'none',
				fillBgColor: '#ff0000',
				fillIconColor: '#ffffff',
				focalX: 50,
				focalY: 50,
			},
		});
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await waitForAppReady(page);
		card = page.locator('.library-card').first();
		await expect(card).toBeVisible();
		const noneHasGradient = await card.evaluate((el) => {
			const layers = el.querySelectorAll(':scope > div');
			return Array.from(layers).some((l) => {
				const bg = getComputedStyle(l as HTMLElement).backgroundImage;
				return bg.includes('gradient');
			});
		});
		expect(noneHasGradient).toBe(true);
	});

	test('focal point スライダー値で object-position が反映される（image モード）', async ({
		page,
	}) => {
		await setItemSize(page, 'M');
		// image モード + 仮の icon_path（CDP では画像ロード自体は不要、style 反映確認のみ）
		await setLibraryCardConfig(page, {
			background: {
				mode: 'image',
				fillBgColor: '#000',
				fillIconColor: '#fff',
				focalX: 75,
				focalY: 25,
			},
		});
		// item に icon_path を後付けで更新
		const item = await invoke<{ id: string }>(page, 'cmd_update_item', {
			id: createdItemIds[0],
			input: { icon_path: 'C:/nonexistent/icon.png' },
		});
		expect(item.id).toBe(createdItemIds[0]);

		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await waitForAppReady(page);

		const card = page.locator('.library-card').first();
		await expect(card).toBeVisible();
		// LibraryCard 内の <img> が configStore.libraryCard.background.focalX/Y を反映
		const objectPosition = await card.evaluate((el) => {
			const img = el.querySelector('img');
			if (!img) return '';
			return getComputedStyle(img).objectPosition;
		});
		// "75% 25%" 期待
		expect(objectPosition).toContain('75%');
		expect(objectPosition).toContain('25%');
	});
});
