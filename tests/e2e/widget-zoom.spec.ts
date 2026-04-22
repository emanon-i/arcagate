import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';

const ZOOM_STORAGE_KEY = 'widget-zoom';
const DEFAULT_ZOOM = 100;

/** localStorage からズーム値を読む */
async function getStoredZoom(page: import('@playwright/test').Page): Promise<number> {
	const raw = await page.evaluate((key: string) => localStorage.getItem(key), ZOOM_STORAGE_KEY);
	if (raw === null) return DEFAULT_ZOOM;
	const val = Number(raw);
	return Number.isNaN(val) ? DEFAULT_ZOOM : val;
}

/** ワークスペースコンテナの data-zoom 属性を読む */
async function getDataZoom(page: import('@playwright/test').Page): Promise<number | null> {
	const raw = await page.locator('[data-zoom]').first().getAttribute('data-zoom');
	if (raw === null) return null;
	const val = Number(raw);
	return Number.isNaN(val) ? null : val;
}

/** localStorage にズーム値を書き込む */
async function setStoredZoom(page: import('@playwright/test').Page, zoom: number): Promise<void> {
	await page.evaluate(
		({ key, val }: { key: string; val: string }) => localStorage.setItem(key, val),
		{ key: ZOOM_STORAGE_KEY, val: String(zoom) },
	);
}

/** localStorage のズーム値を削除する */
async function removeStoredZoom(page: import('@playwright/test').Page): Promise<void> {
	await page.evaluate((key: string) => localStorage.removeItem(key), ZOOM_STORAGE_KEY);
}

test.describe('ウィジェットズーム', () => {
	test('Ctrl+wheel でズームが段階的に変化し data-zoom 属性が更新されること', async ({ page }) => {
		// ズームを初期値に戻す（テスト間の状態リーク防止）
		await removeStoredZoom(page);

		// Workspace タブに切り替え
		await page.getByRole('button', { name: 'Workspace' }).click();
		await page.waitForTimeout(300);

		// data-zoom 要素が表示されていること
		const container = page.locator('[data-zoom]').first();
		await expect(container).toBeVisible();

		// 初期値確認
		const initialZoom = await getDataZoom(page);
		expect(initialZoom).toBe(DEFAULT_ZOOM);

		// Ctrl+ホイール上で3回 → ズームアップ
		await container.hover();
		await page.keyboard.down('Control');
		await container.dispatchEvent('wheel', { deltaY: -100, ctrlKey: true });
		await container.dispatchEvent('wheel', { deltaY: -100, ctrlKey: true });
		await container.dispatchEvent('wheel', { deltaY: -100, ctrlKey: true });
		await page.keyboard.up('Control');
		await page.waitForTimeout(100);

		const zoomedIn = await getDataZoom(page);
		expect(zoomedIn).toBe(130); // 100 + 10*3

		// Ctrl+ホイール下で6回 → ズームダウン（初期値より下）
		await page.keyboard.down('Control');
		await container.dispatchEvent('wheel', { deltaY: 100, ctrlKey: true });
		await container.dispatchEvent('wheel', { deltaY: 100, ctrlKey: true });
		await container.dispatchEvent('wheel', { deltaY: 100, ctrlKey: true });
		await container.dispatchEvent('wheel', { deltaY: 100, ctrlKey: true });
		await container.dispatchEvent('wheel', { deltaY: 100, ctrlKey: true });
		await container.dispatchEvent('wheel', { deltaY: 100, ctrlKey: true });
		await page.keyboard.up('Control');
		await page.waitForTimeout(100);

		const zoomedOut = await getDataZoom(page);
		expect(zoomedOut).toBe(70); // 130 - 10*6

		// ズームをリセット（後続テストへの影響を防ぐ）
		await setStoredZoom(page, DEFAULT_ZOOM);
	});

	test('localStorage にズーム値が永続化されること', async ({ page }) => {
		// 初期化（アプリ状態を確実にリセット）
		await removeStoredZoom(page);
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await waitForAppReady(page);

		// Workspace タブに切り替え
		await page.getByRole('button', { name: 'Workspace' }).click();
		await page.waitForTimeout(300);

		const container = page.locator('[data-zoom]').first();
		await expect(container).toBeVisible();

		// Ctrl+ホイールでズームアップ x2
		await container.hover();
		await page.keyboard.down('Control');
		await container.dispatchEvent('wheel', { deltaY: -100, ctrlKey: true });
		await container.dispatchEvent('wheel', { deltaY: -100, ctrlKey: true });
		await page.keyboard.up('Control');
		await page.waitForTimeout(100);

		// localStorage に保存されていること
		const stored = await getStoredZoom(page);
		expect(stored).toBe(120);

		// ページリロード後も値が復元されること（WebView2 localStorage は保持される）
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await waitForAppReady(page);

		await page.getByRole('button', { name: 'Workspace' }).click();
		await page.waitForTimeout(300);

		const zoomAfterReload = await getDataZoom(page);
		expect(zoomAfterReload).toBe(120);

		// クリーンアップ
		await setStoredZoom(page, DEFAULT_ZOOM);
	});

	test('ズーム範囲が 50〜200 にクランプされること', async ({ page }) => {
		// 200% に設定してリロード
		await setStoredZoom(page, 200);
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await waitForAppReady(page);
		await page.getByRole('button', { name: 'Workspace' }).click();
		await page.waitForTimeout(300);

		const container = page.locator('[data-zoom]').first();
		await expect(container).toBeVisible();

		// ホイール上でさらに上げようとしてもクランプされること
		await container.hover();
		await page.keyboard.down('Control');
		await container.dispatchEvent('wheel', { deltaY: -100, ctrlKey: true });
		await page.keyboard.up('Control');
		await page.waitForTimeout(100);

		const atMax = await getDataZoom(page);
		expect(atMax).toBe(200); // クランプされて 200 に留まる

		// クリーンアップ
		await setStoredZoom(page, DEFAULT_ZOOM);
	});
});
