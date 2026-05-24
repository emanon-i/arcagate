import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '../fixtures/tauri.js';
import { createItem, deleteItem } from '../helpers/ipc.js';
import { disableForceDetailWrapper, enableForceDetailWrapper } from '../helpers/window-resize.js';

/**
 * PH-CF-1100 ⑤⑥ e2e: 見た目設定 (card_override + icon) の解除 / 復元 状態管理。
 *
 * 引用元 guideline:
 *   docs/l2_foundation/features/screens/library.md §appearance 設定の状態管理契約
 *
 * 対象:
 * - LB-5 (⑤ 解除しても画像残る): toggle OFF で item.icon_path が null に倒れ、 一覧カードが
 *   画像なし (fallback アイコン) に戻る。
 * - LB-6 (⑥ 解除→復元で位置消える): toggle OFF → ON で icon_path + offsetX/Y が「OFF 直前と
 *   完全同一」 に復元する。 card_override_json の本体は disabled flag で保持される契約 (`disabled
 *   = true` / `icon_backup = <prev>` 退避 → 復元時に delete で消費)。
 */

function iconDir(): string {
	const appData = process.env.APPDATA ?? join(process.env.USERPROFILE ?? '.', 'AppData', 'Roaming');
	return join(appData, 'com.arcagate.desktop', 'icons');
}

const ICON_PREFIX = 'ph-cf-1100-appearance-';

function setupFixtureIcons(suffix: string): { primary: string } {
	const dir = iconDir();
	mkdirSync(dir, { recursive: true });
	const srcPng = join(process.cwd(), 'src-tauri', 'icons', '128x128.png');
	const primary = join(dir, `${ICON_PREFIX}primary-${suffix}.png`);
	copyFileSync(srcPng, primary);
	return { primary: primary.replace(/\\/g, '/') };
}

function cleanupFixtureIcons(suffix: string): void {
	const dir = iconDir();
	for (const name of [`${ICON_PREFIX}primary-${suffix}.png`]) {
		try {
			rmSync(join(dir, name), { force: true });
		} catch {
			// best-effort
		}
	}
}

async function openLibrary(page: import('@playwright/test').Page): Promise<void> {
	await page.evaluate(() => localStorage.setItem('arcagate.app.activeView', 'library'));
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });
	// PH-CF-1100 ②⑤⑥ 実 UI 経路: detail wrapper を CSS hack で強制表示する。 sharedBrowser
	// worker scope に持ち越して後続 spec を壊さないよう、 必ず afterEach で disableForceDetailWrapper
	// を呼んで cleanup する (本 spec の test.afterEach で実施)。
	await enableForceDetailWrapper(page);
}

test.afterEach(async ({ page }) => {
	// CSS hack の cleanup。 sharedBrowser worker scope に持ち越して LB-7 等で
	// search input が wrapper に intercept される regression を防ぐ。
	await disableForceDetailWrapper(page);
});

test('LB-5 (PH-CF-1100 ⑤): 見た目設定を解除すると一覧カードの画像が消える', async ({ page }) => {
	const suffix = `${process.pid}-${Date.now()}`;
	const { primary } = setupFixtureIcons(suffix);
	const item = await createItem(page, {
		item_type: 'url',
		label: `PH-CF-1100 LB-5 ${suffix}`,
		target: `https://example.com/ph-cf-1100-lb-5-${suffix}`,
		icon_path: primary,
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});

	try {
		await openLibrary(page);
		const card = page.getByTestId(`library-card-${item.id}`);
		await card.waitFor({ state: 'attached', timeout: 15_000 });
		await card.scrollIntoViewIfNeeded();
		// 初期: icon_path 設定済 → <img> 要素が存在し src が primary を含む。
		const primaryTail = primary.split('/').pop() ?? primary;
		await expect
			.poll(async () => (await card.locator('img').first().getAttribute('src')) ?? '', {
				timeout: 5_000,
				intervals: [100, 200, 400],
			})
			.toContain(primaryTail);

		// detail panel を開いて「見た目設定」 ON → OFF を click sequence で実行。
		await card.click();
		await page.getByTestId('library-detail-panel').waitFor({ state: 'visible', timeout: 5_000 });
		const toggle = page.getByTestId('card-override-toggle');
		// 初期状態は OFF (card_override_json なし)。 ON → OFF の経路で「画像が消える」 を verify。
		if (!(await toggle.isChecked())) await toggle.check();
		await page.waitForTimeout(200); // ON 反映の microtask flush
		// 次に OFF。 内部で disabled=true + icon_backup 退避 + icon_path: null を 1 IPC で書く。
		await toggle.uncheck();

		// 一覧カードの <img> 要素が消えて FallbackIcon (SVG) になることを verify。
		// LibraryView の {#key item.icon_path|...} で再マウントされ ItemIcon が <img> ではなく
		// <FallbackIcon> branch を render するため、 `card.locator('img').count()` が 0 になる。
		await expect
			.poll(async () => await card.locator('img').count(), {
				timeout: 5_000,
				intervals: [100, 200, 400],
			})
			.toBe(0);
	} finally {
		await deleteItem(page, item.id).catch(() => {});
		cleanupFixtureIcons(suffix);
	}
});

test('LB-6 (PH-CF-1100 ⑥): 見た目設定 OFF→ON で画像 + 位置 (offsetX/Y) が完全復元する', async ({
	page,
}) => {
	// PH-CF-1100 ⑥ 真因経路: handleCardOverrideToggle の OFF/ON が 1 IPC で
	// `disabled` / `icon_backup` を退避 / 復元する契約。 CardOverrideDialog の slider UI 経由で
	// offset を入れる経路は bits-ui overlay の dialog close button click が flaky (CI run
	// 26373656972 で連鎖 fail を起こした) なため、 dialog UI を経由せず IPC 直叩きで初期値を
	// 仕込んで「UI で toggle OFF → ON → items 配列を read して 状態が完全保存」 を verify する。
	// dialog UI (= slider) は別 spec で別途 verify する分担 (LB-2 が picker UI 経路を担う)。
	const suffix = `${process.pid}-${Date.now()}`;
	const { primary } = setupFixtureIcons(suffix);
	const item = await createItem(page, {
		item_type: 'url',
		label: `PH-CF-1100 LB-6 ${suffix}`,
		target: `https://example.com/ph-cf-1100-lb-6-${suffix}`,
		icon_path: primary,
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});

	try {
		// (1) 初期 card_override_json (background offsetX=15 / offsetY=80) を IPC で仕込む。
		const initialJson = JSON.stringify({
			background: { offsetX: 15, offsetY: 80, rotation: 0 },
			style: {
				textColor: '#ffffff',
				overlayEnabled: true,
				strokeEnabled: false,
				strokeColor: '#000000',
				strokeWidthPx: 1,
			},
		});
		await page.evaluate(
			async ({ id, json }) => {
				const w = window as unknown as {
					__TAURI_INTERNALS__?: { invoke?: (cmd: string, args: unknown) => Promise<unknown> };
				};
				await w.__TAURI_INTERNALS__?.invoke?.('cmd_update_item', {
					id,
					input: { card_override_json: json },
				});
			},
			{ id: item.id, json: initialJson },
		);

		// (2) Library を開いて detail panel → toggle を UI で OFF → ON。
		await openLibrary(page);
		const card = page.getByTestId(`library-card-${item.id}`);
		await card.waitFor({ state: 'attached', timeout: 15_000 });
		await card.scrollIntoViewIfNeeded();
		await card.click();
		await page.getByTestId('library-detail-panel').waitFor({ state: 'visible', timeout: 5_000 });
		const toggle = page.getByTestId('card-override-toggle');
		await expect.poll(async () => await toggle.isChecked(), { timeout: 5_000 }).toBe(true);
		await toggle.uncheck();
		await page.waitForTimeout(300);
		await toggle.check();
		await page.waitForTimeout(400);

		// (3) items 配列を IPC で read して PH-CF-1100 ⑥ 契約 (disabled 消費 / icon_backup 消費 /
		// offsetX/Y 完全保存) を assert する。 dialog UI を経由しないので flaky path を踏まない。
		const restored = (await page.evaluate(async (id) => {
			const w = window as unknown as {
				__TAURI_INTERNALS__?: { invoke?: (cmd: string, args: unknown) => Promise<unknown> };
			};
			const items = (await w.__TAURI_INTERNALS__?.invoke?.('cmd_list_items', {})) as Array<{
				id: string;
				icon_path: string | null;
				card_override_json: string | null;
			}>;
			return items.find((i) => i.id === id) ?? null;
		}, item.id)) as { icon_path: string | null; card_override_json: string | null } | null;

		expect(restored).not.toBeNull();
		expect(restored?.icon_path, 'PH-CF-1100 ⑤: 復元で icon_path が icon_backup から戻る').toBe(
			primary,
		);
		const restoredJson = JSON.parse(restored?.card_override_json ?? '{}');
		expect(restoredJson.disabled, 'PH-CF-1100 ⑥: 復元で disabled フラグが消える').toBeUndefined();
		expect(
			restoredJson.icon_backup,
			'PH-CF-1100 ⑥: 復元で icon_backup フィールドが消費される (delete restored.icon_backup)',
		).toBeUndefined();
		expect(
			restoredJson.background?.offsetX,
			'PH-CF-1100 ⑥: 復元で offsetX が OFF 直前の値と完全一致',
		).toBe(15);
		expect(restoredJson.background?.offsetY, 'PH-CF-1100 ⑥: 復元で offsetY が完全一致').toBe(80);
	} finally {
		await deleteItem(page, item.id).catch(() => {});
		cleanupFixtureIcons(suffix);
	}
});
