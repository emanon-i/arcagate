import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { createItem, deleteItem, invoke } from '../helpers/ipc.js';
import { resizeWindow } from '../helpers/resize.js';

/**
 * Library カードメタデータ表示 E2E（PH-20260425-285 / 288）
 *
 * 検証対象:
 *  - cmd_get_item_metadata IPC が item_type 別に動作
 *  - LibraryCard が L サイズでメタデータ追加行を表示する
 *  - URL アイテムでドメイン抽出が機能
 */

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

test.describe('Library カードメタデータ表示（PH-285 / 288）', () => {
	let createdItemIds: string[] = [];

	test.beforeEach(async ({ page }) => {
		await resizeWindow(page, 1280, 800);
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
	});

	test.afterEach(async ({ page }) => {
		for (const id of createdItemIds) {
			await deleteItem(page, id).catch(() => {});
		}
		createdItemIds = [];
	});

	test(
		'cmd_get_item_metadata が url アイテムでドメインを返す',
		{ tag: '@smoke' },
		async ({ page }) => {
			const item = await createItem(page, {
				item_type: 'url',
				label: 'metadata-url-test',
				target: 'https://www.example.com/path?q=1',
			});
			createdItemIds.push(item.id);

			const meta = await invoke<{ urlDomain?: string }>(page, 'cmd_get_item_metadata', {
				itemId: item.id,
			});
			expect(meta.urlDomain).toBe('example.com');
		},
	);

	test(
		'cmd_get_item_metadata が folder アイテムで child_count を返す',
		{ tag: '@smoke' },
		async ({ page }) => {
			// このリポジトリの src フォルダを target にする（必ず存在する）
			// 注: テスト実行時の cwd が project root なので src/ が見える
			const item = await createItem(page, {
				item_type: 'folder',
				label: 'metadata-folder-test',
				target: 'src',
			});
			createdItemIds.push(item.id);

			const meta = await invoke<{
				childCount?: number;
				folderTotalBytes?: number;
				modifiedAt?: string;
			}>(page, 'cmd_get_item_metadata', {
				itemId: item.id,
			});
			// src ディレクトリが存在すれば child_count >= 1
			expect(meta.childCount ?? 0).toBeGreaterThan(0);
			// modified_at は ISO 8601 形式
			expect(meta.modifiedAt ?? '').toMatch(/^\d{4}-\d{2}-\d{2}T/);
		},
	);

	test('cmd_get_item_metadata が不在パスで空オブジェクトを返す', async ({ page }) => {
		const item = await createItem(page, {
			item_type: 'folder',
			label: 'metadata-folder-missing',
			target: 'Z:/__never_exists__',
		});
		createdItemIds.push(item.id);

		const meta = await invoke<{
			childCount?: number;
			folderTotalBytes?: number;
			modifiedAt?: string;
		}>(page, 'cmd_get_item_metadata', { itemId: item.id });
		// すべて undefined になる（best-effort）
		expect(meta.childCount).toBeUndefined();
		expect(meta.folderTotalBytes).toBeUndefined();
		expect(meta.modifiedAt).toBeUndefined();
	});

	test('LibraryCard L サイズで url アイテムにドメインが表示される', async ({ page }) => {
		const item = await createItem(page, {
			item_type: 'url',
			label: 'lib-card-meta-url',
			target: 'https://www.example.com/abc',
		});
		createdItemIds.push(item.id);

		await setItemSize(page, 'L');
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await waitForAppReady(page);

		const card = page.getByTestId(`library-card-${item.id}`);
		await expect(card).toBeVisible();
		// 下部オーバーレイ内に "example.com" が現れるまで待つ（lazy fetch）
		await expect(card).toContainText('example.com', { timeout: 10_000 });
	});
});
