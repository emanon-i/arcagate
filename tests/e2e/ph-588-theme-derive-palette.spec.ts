/**
 * PR #588 — surface tint mix chain の primary 連動 e2e (unique 観点)。
 *
 * 他 spec のカバレッジ:
 *  - ph-cf-1310: --c-info chain alive / surface tint strength 6 theme 差 / accent hover-focus 連動
 *  - ph-cf-800 TS-3: aesthetic identity 4 軸 (radius / blur / shadow / pattern) の clone 等値
 *  - ph-cf-1300 ⑪: accent chain 温存 (primary 編集で --ag-accent-* 派生連動)
 *
 * 本 spec の unique scope:
 *  glass dark で primary を変えたとき、 PR #588 で新設した surface mix chain
 *  (`--ag-surface-tint-mix` 経由で `--ag-surface-1` に primary hue を 30% 注入) が live で
 *  連動することを実描画レベルで verify。 `--ag-surface-1` は LibraryCard / Workspace / Sidebar 等の
 *  dominant な surface 塗りに使われるため、 chain freeze 回帰が起きると user 視点で「primary
 *  を変えても背景が全く変わらない」 体感に直結する (audit doc §B.1 で指摘した「中立グレー一色」
 *  の構造的源泉)。
 *
 * 引用元:
 *  - docs/l3_phases/audit/THEME_DERIVE_PALETTE_2026-05-27.md (派生 token 規格)
 *  - docs/l3_phases/audit/BUILTIN_THEME_DIFF_MATRIX_2026-05-27.md §B.1
 */

import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/tauri.js';
import { invoke } from '../helpers/ipc.js';

interface Theme {
	id: string;
	is_builtin: boolean;
	[k: string]: unknown;
}

async function listThemes(page: Page): Promise<Theme[]> {
	return invoke<Theme[]>(page, 'cmd_list_themes');
}

async function setActiveThemeMode(page: Page, mode: string): Promise<void> {
	await invoke<void>(page, 'cmd_set_active_theme_mode', { mode });
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

async function captureSurfaceChain(page: Page): Promise<{
	primary: string;
	tintMix: string;
	surface1: string;
	surfacePage: string;
}> {
	return page.evaluate(() => {
		const cs = getComputedStyle(document.documentElement);
		return {
			primary: cs.getPropertyValue('--c-primary').trim(),
			tintMix: cs.getPropertyValue('--ag-surface-tint-mix').trim(),
			surface1: cs.getPropertyValue('--ag-surface-1').trim(),
			surfacePage: cs.getPropertyValue('--ag-surface-page').trim(),
		};
	});
}

test('PR #588: glass dark で primary を変更すると --ag-surface-* chain が live で連動する', async ({
	page,
}) => {
	await openSettingsAppearance(page);
	await page.getByTestId('settings-theme-button-dark').click();
	await waitForActiveDataTheme(page, (v) => v === 'dark');

	const customsBefore = (await listThemes(page)).filter((t) => !t.is_builtin).length;
	await page.getByTestId('settings-theme-clone-dark').click();
	const clonedId = await waitForActiveDataTheme(
		page,
		(v) => Boolean(v) && v !== 'dark' && v !== 'light',
	);
	expect(clonedId).toMatch(/^[0-9a-f]{8}-/);

	try {
		await expect
			.poll(async () => (await listThemes(page)).filter((t) => !t.is_builtin).length, {
				timeout: 5_000,
			})
			.toBe(customsBefore + 1);

		const primaryPicker = page.getByTestId('theme-editor-primary-color');
		await primaryPicker.waitFor({ state: 'visible', timeout: 10_000 });

		const before = await captureSurfaceChain(page);
		// baseline: chain は alive (= surface-1 が非空 computed value を持つ)。
		expect(before.tintMix.length).toBeGreaterThan(0);
		expect(before.surface1.length).toBeGreaterThan(0);
		expect(before.surfacePage.length).toBeGreaterThan(0);

		// primary を red (#ff0000) に変更。
		await primaryPicker.evaluate((el: HTMLInputElement) => {
			el.value = '#ff0000';
			el.dispatchEvent(new Event('input', { bubbles: true }));
		});

		const saveBtn = page.getByTestId('theme-editor-save');
		await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
		await saveBtn.click();

		await expect
			.poll(
				async () => {
					const c = await captureSurfaceChain(page);
					return c.primary;
				},
				{ timeout: 5_000, intervals: [100, 200, 400] },
			)
			.toContain('#ff0000');

		const after = await captureSurfaceChain(page);
		expect(after.primary).toContain('#ff0000');

		// chain alive verify (PR #588 の本丸):
		// `--ag-surface-tint-mix` = `color-mix(in oklab, var(--c-fg), var(--c-primary) 30%)` /
		// `--ag-surface-1` = `color-mix(in oklab, var(--c-bg), var(--ag-surface-tint-mix) 4%)`
		// computed value は CSS が #ff0000 を inline 展開した文字列に置き換える。
		expect(after.tintMix, '--ag-surface-tint-mix should embed new primary').toContain('#ff0000');
		expect(
			after.surface1,
			'--ag-surface-1 should re-derive from new primary via tintMix',
		).toContain('#ff0000');
		expect(after.surfacePage, '--ag-surface-page should re-derive from new primary').toContain(
			'#ff0000',
		);

		// 回帰検出: 旧 primary (青 oklch 0.5 0.14 215) が surface 派生に残っていない。
		expect(after.tintMix).not.toBe(before.tintMix);
		expect(after.surface1).not.toBe(before.surface1);
		expect(after.surfacePage).not.toBe(before.surfacePage);
	} finally {
		await setActiveThemeMode(page, 'dark').catch(() => {});
		await deleteTheme(page, clonedId).catch(() => {});
	}
});
