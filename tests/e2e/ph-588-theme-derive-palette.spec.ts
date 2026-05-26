/**
 * PR #588 (derivePalette) の実 UI / 実描画レベル検証。
 *
 * 検証対象:
 *  1. **6 builtin の差分が computed style に出る**: aesthetic identity 4 軸 (radius / blur /
 *     shadow / pattern) + semantic 4 軸 (warn / error / success / info) + 新 chain (surface
 *     tint mix / accent hover) が 6 theme で意図どおりに差が出る。
 *  2. **primary 変更で派生 token chain が live で連動**: PR #586 ⑪ で確立した accent chain
 *     の温存に加え、 PR #588 で新設した surface mix chain (`--ag-surface-tint-mix` 経由で
 *     surface に primary hue を 30% 注入) が glass theme で primary 連動する。
 *
 * 引用元:
 *  - docs/l3_phases/audit/BUILTIN_THEME_DIFF_MATRIX_2026-05-27.md §1 / §5
 *  - PR #586 ⑪ chain 温存 (ph-cf-1300-theme-chain-preserve.spec.ts)
 */

import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/tauri.js';
import { invoke } from '../helpers/ipc.js';

interface Theme {
	id: string;
	name: string;
	base_theme: 'dark' | 'light';
	css_vars: string;
	is_builtin: boolean;
	created_at: string;
	updated_at: string;
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

/**
 * `<html>` の computed style から PR #588 で意味を持つ token を採取する。
 * computed value は inline / class CSS / [data-theme] CSS / :root を統合した実描画値。
 */
async function captureExtendedAesthetic(page: Page): Promise<{
	bg: string;
	fg: string;
	primary: string;
	blur: string;
	radiusLg: string;
	// semantic 4 軸 (PR #588)
	warn: string;
	error: string;
	success: string;
	info: string;
	// 新 surface tint chain (PR #588): glass で 30% / 他で 0%
	tintStrength: string;
	tintMix: string;
	surface1: string;
	// accent hover chain (PR #588)
	accentHover: string;
	accentFocusRing: string;
}> {
	return page.evaluate(() => {
		const cs = getComputedStyle(document.documentElement);
		return {
			bg: cs.getPropertyValue('--c-bg').trim(),
			fg: cs.getPropertyValue('--c-fg').trim(),
			primary: cs.getPropertyValue('--c-primary').trim(),
			blur: cs.getPropertyValue('--surface-blur').trim(),
			radiusLg: cs.getPropertyValue('--ag-radius-lg').trim(),
			warn: cs.getPropertyValue('--c-warn').trim(),
			error: cs.getPropertyValue('--c-error').trim(),
			success: cs.getPropertyValue('--c-success').trim(),
			info: cs.getPropertyValue('--c-info').trim(),
			tintStrength: cs.getPropertyValue('--ag-surface-tint-strength').trim(),
			tintMix: cs.getPropertyValue('--ag-surface-tint-mix').trim(),
			surface1: cs.getPropertyValue('--ag-surface-1').trim(),
			accentHover: cs.getPropertyValue('--ag-accent-hover').trim(),
			accentFocusRing: cs.getPropertyValue('--ag-accent-focus-ring').trim(),
		};
	});
}

test('PR #588 ①: 6 builtin の computed token が aesthetic + semantic + 新 chain で意図どおり差が出る', async ({
	page,
}) => {
	// 各 builtin を順次 active 化し、 captureExtendedAesthetic で実 token を採取。
	// 「すべて同じ」 にならないこと + aesthetic / semantic 期待値スポット確認の 2 軸 verify。
	await openSettingsAppearance(page);

	const observed: Record<string, Awaited<ReturnType<typeof captureExtendedAesthetic>>> = {};
	for (const id of [
		'dark',
		'light',
		'brutalist',
		'brutalist-dark',
		'neumorph',
		'neumorph-dark',
	] as const) {
		await page.getByTestId(`settings-theme-button-${id}`).click();
		await waitForActiveDataTheme(page, (v) => v === id);
		observed[id] = await captureExtendedAesthetic(page);
	}

	// --- 1. aesthetic identity: radius / blur が 3 系統で完全に区別される ---
	expect(observed.dark.radiusLg).toBe('22px');
	expect(observed.light.radiusLg).toBe('22px');
	expect(observed.brutalist.radiusLg).toBe('0px');
	expect(observed['brutalist-dark'].radiusLg).toBe('0px');
	expect(observed.neumorph.radiusLg).toBe('24px');
	expect(observed['neumorph-dark'].radiusLg).toBe('24px');

	expect(observed.dark.blur).toContain('blur(16px)');
	expect(observed.light.blur).toContain('blur(8px)');
	expect(observed.brutalist.blur).toBe('none');
	expect(observed['brutalist-dark'].blur).toBe('none');
	expect(observed.neumorph.blur).toBe('none');
	expect(observed['neumorph-dark'].blur).toBe('none');

	// --- 2. PR #588 新 chain: surface tint strength が glass=30% / 他=0% で差別化される ---
	// derive-palette.ts §audit B.1 「dominant 領域に primary hue を chain で 30% mix」 の核。
	expect(observed.dark.tintStrength).toBe('30%');
	expect(observed.light.tintStrength).toBe('30%');
	expect(observed.brutalist.tintStrength).toBe('0%');
	expect(observed['brutalist-dark'].tintStrength).toBe('0%');
	expect(observed.neumorph.tintStrength).toBe('0%');
	expect(observed['neumorph-dark'].tintStrength).toBe('0%');

	// --- 3. semantic 4 軸: canonical hue が固定 (warn=75 / error=25 / success=150 / info=230) ---
	// 「hue が全 theme で同じ」 = 信号性維持。 l/c は aesthetic × base で差が出る。
	for (const id of Object.keys(observed)) {
		const t = observed[id];
		// 文字列内に canonical hue がリテラルで含まれる (derivePalette で形式統一済)。
		expect(t.warn, `${id}.warn must contain canonical hue 75`).toMatch(/\b75\b/);
		expect(t.error, `${id}.error must contain canonical hue 25`).toMatch(/\b25\b/);
		expect(t.success, `${id}.success must contain canonical hue 150`).toMatch(/\b150\b/);
		expect(t.info, `${id}.info must contain canonical hue 230`).toMatch(/\b230\b/);
	}

	// --- 4. primary が 3 系統で hue 識別される ---
	// glass = blue (H215), brutalist = red-orange (H28), neumorph = purple (H280)。
	expect(observed.dark.primary).toMatch(/\b215\b/);
	expect(observed.brutalist.primary).toMatch(/\b28\b/);
	expect(observed.neumorph.primary).toMatch(/\b280\b/);

	// --- 5. accent hover chain が CSS 経由で派生する (literal 凍結していない) ---
	// `--ag-accent-hover` は `color-mix(in oklab, var(--c-primary), var(--c-fg) 15%)` で
	// 各 theme の primary + fg を映し、 値が空でない。
	for (const id of Object.keys(observed)) {
		const t = observed[id];
		expect(t.accentHover.length, `${id}.accentHover must compute non-empty`).toBeGreaterThan(0);
		expect(t.accentFocusRing.length, `${id}.accentFocusRing must compute`).toBeGreaterThan(0);
	}

	// --- 6. 「ぜんぶ同じ」 になっていない (= 機械検出としての絶対線) ---
	// 6 theme の primary 値の uniq が >= 3 (glass×2 / brutalist×2 / neumorph×2 で hue は 3 種)。
	const uniqPrimaries = new Set(Object.values(observed).map((t) => t.primary));
	expect(uniqPrimaries.size).toBeGreaterThanOrEqual(3);

	// cleanup
	await setActiveThemeMode(page, 'dark').catch(() => {});
});

test('PR #588 ②: glass dark で primary を変更すると surface tint chain が live で連動する', async ({
	page,
}) => {
	// 検証の本丸: 新 chain `--ag-surface-tint-mix` = `color-mix(in oklab, var(--c-fg),
	// var(--c-primary) var(--ag-surface-tint-strength))` が live で primary 連動するか。
	// glass dark (strength=30%) を複製 → primary を red に → surface-1 / surface-tint-mix の
	// computed value に red 由来 (rgb の R 成分高) が出ることを観測。
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

		const before = await captureExtendedAesthetic(page);
		// glass dark の strength は 30% を保つ (override で 0% になっていない)。
		expect(before.tintStrength).toBe('30%');
		// surface tint mix が `var(--c-primary)` 経由で「primary の hue」 を含む (literal 凍結なら出ない)。
		expect(before.tintMix.length).toBeGreaterThan(0);

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
					const c = await captureExtendedAesthetic(page);
					return c.primary;
				},
				{ timeout: 5_000, intervals: [100, 200, 400] },
			)
			.toContain('#ff0000');

		const after = await captureExtendedAesthetic(page);
		expect(after.primary).toContain('#ff0000');

		// PR #588 新 chain の真の検証: surface tint mix / surface-1 が red 由来に変化する。
		// computed value は `color-mix(in oklab, ...)` の文字列を含み、 内部に `#ff0000` (もしくは
		// 等価 rgb) が含まれていれば chain が生きている (literal で freeze していない)。
		expect(after.tintMix, 'tintMix should embed new primary value').toContain('#ff0000');
		expect(after.surface1, 'surface-1 should be re-derived from new primary via tintMix').toContain(
			'#ff0000',
		);

		// accent hover chain も live 更新 (PR #586 chain 温存 + PR #588 拡張)。
		expect(after.accentHover).toContain('#ff0000');
		expect(after.accentFocusRing).toContain('#ff0000');

		// 回帰防止: 旧 primary (青 oklch 0.5 0.14 215) が surface/accent 派生に残っていない。
		expect(after.tintMix).not.toContain(before.primary);
		expect(after.surface1).not.toContain(before.primary);
		expect(after.accentHover).not.toContain(before.primary);
	} finally {
		await setActiveThemeMode(page, 'dark').catch(() => {});
		await deleteTheme(page, clonedId).catch(() => {});
	}
});
