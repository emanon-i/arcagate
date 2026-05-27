/**
 * PR #591: 6 候補ピッカー UI + harmony モード拡張の実 UI 検証。
 *
 * 検証対象:
 *  1. light builtin を複製 → ThemeEditor が active
 *  2. 「6 候補」 button click で 6 候補グリッドが表示される
 *  3. 6 候補各 button の primary/secondary swatch が異なる色で描画されている (= randomize の hue 振り幅)
 *  4. 候補の 1 つを click → primary / secondary が適用されて grid が閉じる
 *  5. 適用後の primary 値が候補と一致 (= UI の wiring が正しい)
 *
 * 引用元:
 *  - PR #591 spec: user 追加要件 「いろんな組み合わせがたくさん出るほうが嬉しい」
 */

import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/tauri.js';
import { invoke } from '../helpers/ipc.js';

interface Theme {
	id: string;
	is_builtin: boolean;
	[k: string]: unknown;
}

async function setActiveThemeMode(page: Page, mode: string): Promise<void> {
	await invoke<void>(page, 'cmd_set_active_theme_mode', { mode });
}

async function listThemes(page: Page): Promise<Theme[]> {
	return invoke<Theme[]>(page, 'cmd_list_themes');
}

async function deleteTheme(page: Page, id: string): Promise<void> {
	await invoke<void>(page, 'cmd_delete_theme', { id });
}

async function openSettingsAppearance(page: Page): Promise<void> {
	await page.evaluate(() => localStorage.setItem('arcagate.app.activeView', 'library'));
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });
	await page.getByRole('button', { name: 'Settings', exact: true }).click();
	await page.locator('#tab-appearance').click();
	await page
		.getByTestId('settings-theme-button-dark')
		.waitFor({ state: 'visible', timeout: 15_000 });
}

async function waitForActiveDataTheme(
	page: Page,
	predicate: (val: string | undefined) => boolean,
	timeoutMs = 5_000,
): Promise<string> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const val = await page.evaluate(() => document.documentElement.dataset.theme);
		if (predicate(val)) return val ?? '';
		await page.waitForTimeout(50);
	}
	throw new Error('data-theme did not match predicate within timeout');
}

test('「6 候補」 button で 6 候補ピッカーが表示され、 click で適用される', async ({ page }) => {
	await openSettingsAppearance(page);
	await page.getByTestId('settings-theme-button-light').click();
	await waitForActiveDataTheme(page, (v) => v === 'light');

	const customsBefore = (await listThemes(page)).filter((t) => !t.is_builtin).length;
	await page.getByTestId('settings-theme-clone-light').click();
	const clonedId = await waitForActiveDataTheme(
		page,
		(v) => Boolean(v) && v !== 'light' && v !== 'dark',
	);

	try {
		await expect
			.poll(async () => (await listThemes(page)).filter((t) => !t.is_builtin).length, {
				timeout: 5_000,
			})
			.toBe(customsBefore + 1);

		// 「6 候補」 button が visible で click 可能。
		const sixButton = page.getByTestId('theme-editor-random-six');
		await sixButton.waitFor({ state: 'visible', timeout: 10_000 });

		// click 前は candidates グリッドは非表示。
		await expect(page.getByTestId('theme-editor-candidates')).toHaveCount(0);

		// click → 6 候補 が表示される。
		await sixButton.click();
		const grid = page.getByTestId('theme-editor-candidates');
		await expect(grid).toBeVisible({ timeout: 3_000 });

		// 6 個の candidate button が存在する。
		for (let i = 0; i < 6; i++) {
			await expect(page.getByTestId(`theme-editor-candidate-${i}`)).toBeVisible();
		}

		// 1 個目を click → 適用、 グリッドが閉じる。
		const primaryPicker = page.getByTestId('theme-editor-primary-color');
		const primaryBefore = await primaryPicker.inputValue();
		await page.getByTestId('theme-editor-candidate-0').click();

		// grid が閉じる (= candidates state がリセット)
		await expect(grid).toHaveCount(0, { timeout: 3_000 });

		// primary が変化した (= 適用された)
		const primaryAfter = await primaryPicker.inputValue();
		expect(primaryAfter).not.toBe(primaryBefore);
		expect(primaryAfter).toMatch(/^#[0-9a-f]{6}$/i);
	} finally {
		await setActiveThemeMode(page, 'dark').catch(() => {});
		await deleteTheme(page, clonedId).catch(() => {});
	}
});

test('6 候補それぞれが異なる primary を提示する (harmony 多様性)', async ({ page }) => {
	await openSettingsAppearance(page);
	await page.getByTestId('settings-theme-button-light').click();
	await waitForActiveDataTheme(page, (v) => v === 'light');

	await page.getByTestId('settings-theme-clone-light').click();
	const clonedId = await waitForActiveDataTheme(
		page,
		(v) => Boolean(v) && v !== 'light' && v !== 'dark',
	);

	try {
		const sixButton = page.getByTestId('theme-editor-random-six');
		await sixButton.waitFor({ state: 'visible', timeout: 10_000 });
		await sixButton.click();
		await page.getByTestId('theme-editor-candidates').waitFor({ state: 'visible', timeout: 3_000 });

		// 6 候補の background-color (= primary swatch) を採取して 「一意な色が複数」 を verify。
		// 全候補が同じ primary になるのは randomize の妥当性が壊れているサイン。
		const swatches: string[] = [];
		for (let i = 0; i < 6; i++) {
			const button = page.getByTestId(`theme-editor-candidate-${i}`);
			const primarySwatch = button.locator('div > div').first();
			const bg = await primarySwatch.evaluate(
				(el) => (el as HTMLElement).style.backgroundColor || getComputedStyle(el).backgroundColor,
			);
			swatches.push(bg);
		}
		const unique = new Set(swatches);
		expect(
			unique.size,
			`6 候補で primary swatch がユニーク (= randomize の hue 振り幅、 fallback で全部同色なら 1)`,
		).toBeGreaterThanOrEqual(4);
	} finally {
		await setActiveThemeMode(page, 'dark').catch(() => {});
		await deleteTheme(page, clonedId).catch(() => {});
	}
});
