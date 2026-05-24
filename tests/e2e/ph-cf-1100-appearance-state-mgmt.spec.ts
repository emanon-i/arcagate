import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '../fixtures/tauri.js';
import { mockTauriOpenDialog, unmockTauriOpenDialog } from '../helpers/dialog-mock.js';
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
}, testInfo) => {
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
		await openLibrary(page);
		const card = page.getByTestId(`library-card-${item.id}`);
		await card.waitFor({ state: 'attached', timeout: 15_000 });
		await card.scrollIntoViewIfNeeded();
		await card.click();
		await page.getByTestId('library-detail-panel').waitFor({ state: 'visible', timeout: 5_000 });

		// (1) 「見た目設定」 を ON にして歯車から CardOverrideDialog を開く。
		const toggle = page.getByTestId('card-override-toggle');
		if (!(await toggle.isChecked())) await toggle.check();
		await expect(page.getByTestId('card-override-open-dialog')).toBeEnabled({ timeout: 5_000 });
		await page.getByTestId('card-override-open-dialog').click();
		const offsetX = page.getByTestId('card-override-offset-x');
		const offsetY = page.getByTestId('card-override-offset-y');
		await offsetX.waitFor({ state: 'visible', timeout: 5_000 });

		// (2) offsetX / offsetY を 0 / 50 (= 既定 50/50 と異なる値) に変更し persist。
		//     slider は range input なので fill で値を入力 → input/change イベントを発火させる。
		await offsetX.fill('15');
		await offsetX.dispatchEvent('change');
		await offsetY.fill('80');
		await offsetY.dispatchEvent('change');

		// 「画像を選択」 で primary icon を再 pick (test 用に固定 path)。
		await mockTauriOpenDialog(page, primary);
		await page.getByTestId('card-override-image-select').click();
		await page.waitForTimeout(400); // updateItem の persist 完了待ち

		// dialog を閉じる。
		const closeBtns = page.getByRole('button', { name: /閉じる|Close/i });
		const dialogClose = closeBtns.first();
		if (await dialogClose.isVisible().catch(() => false)) {
			await dialogClose.click();
		} else {
			await page.keyboard.press('Escape');
		}
		await page.waitForTimeout(200);

		// (3) OFF → ON: disabled flag + icon_backup 経由で復元される。
		await toggle.uncheck();
		await page.waitForTimeout(200);
		await toggle.check();
		await page.waitForTimeout(400);

		// (4) 再度 dialog を開き offsetX / offsetY が 15 / 80 のまま復元されていることを verify。
		await page.getByTestId('card-override-open-dialog').click();
		const restoredOffsetX = page.getByTestId('card-override-offset-x');
		const restoredOffsetY = page.getByTestId('card-override-offset-y');
		await restoredOffsetX.waitFor({ state: 'visible', timeout: 5_000 });
		await expect
			.poll(async () => await restoredOffsetX.inputValue(), { timeout: 5_000 })
			.toBe('15');
		await expect
			.poll(async () => await restoredOffsetY.inputValue(), { timeout: 5_000 })
			.toBe('80');

		// icon_path も復元されている (= 一覧カードに <img> がある)。
		await expect
			.poll(async () => await card.locator('img').count(), { timeout: 5_000 })
			.toBeGreaterThan(0);

		await testInfo.attach('lb-6-after-restore.png', {
			body: await page.screenshot({ fullPage: false }),
			contentType: 'image/png',
		});
		await unmockTauriOpenDialog(page);
	} finally {
		await deleteItem(page, item.id).catch(() => {});
		cleanupFixtureIcons(suffix);
	}
});
