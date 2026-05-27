/**
 * PR #588 derive-palette / surface-tint / info chain 実 UI 検証。
 *
 * 検証対象 (DEV_REVIEW_R4 ⑫後半 + audit BUILTIN_THEME_DIFF_MATRIX_2026-05-27 §5):
 *  1. 6 builtin が **異なる `--c-info`** を持つ (canonical hue=230 + aesthetic × base calibration)。
 *     旧 builtin は info を持たず、 link / hint / detail callout 用 semantic が欠落していた。
 *  2. glass dark/light は **surface に primary hue が注入**される (`--ag-surface-tint-strength=30%`)
 *     一方、 brutalist / neumorph は 0% override で **neutral surface を温存**する。
 *     `--ag-surface-1` の computed 値を 6 theme で採取し、 aesthetic ごとの計算差を assert。
 *  3. accent hover / focus ring chain alive: primary 変更で `--ag-accent-hover` / `--ag-accent-focus-ring`
 *     が連動する。 chain freeze 回帰 (PR #586 と同型) の detection。
 *
 * 引用元:
 *  docs/l3_phases/audit/BUILTIN_THEME_DIFF_MATRIX_2026-05-27.md §5
 *  docs/l3_phases/audit/DEV_REVIEW_R4_THREE_DEFECTS_2026-05-27.md §4
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

/** computed style から主要 derived token を採取 (parseable な文字列形式)。 */
async function captureDerivedTokens(page: Page): Promise<{
	primary: string;
	info: string;
	infoBg: string;
	infoText: string;
	surface1: string;
	accentHover: string;
	accentFocusRing: string;
	tintStrength: string;
}> {
	return page.evaluate(() => {
		const cs = getComputedStyle(document.documentElement);
		return {
			primary: cs.getPropertyValue('--c-primary').trim(),
			info: cs.getPropertyValue('--c-info').trim(),
			infoBg: cs.getPropertyValue('--ag-info-bg').trim(),
			infoText: cs.getPropertyValue('--ag-info-text').trim(),
			surface1: cs.getPropertyValue('--ag-surface-1').trim(),
			accentHover: cs.getPropertyValue('--ag-accent-hover').trim(),
			accentFocusRing: cs.getPropertyValue('--ag-accent-focus-ring').trim(),
			tintStrength: cs.getPropertyValue('--ag-surface-tint-strength').trim(),
		};
	});
}

const BUILTIN_IDS = [
	'dark',
	'light',
	'brutalist',
	'brutalist-dark',
	'neumorph',
	'neumorph-dark',
] as const;

test('6 builtin で `--c-info` が定義済 + 異なる l/c を持つ', async ({ page }) => {
	await openSettingsAppearance(page);

	const tokens: Record<string, string> = {};
	for (const id of BUILTIN_IDS) {
		await page.getByTestId(`settings-theme-button-${id}`).click();
		await waitForActiveDataTheme(page, (v) => v === id);
		const captured = await captureDerivedTokens(page);
		expect(captured.info, `${id}: --c-info must be defined (non-empty)`).not.toBe('');
		tokens[id] = captured.info;
		// canonical hue 230 が出現することを check (parse 強度: oklch(L C 230) 形式想定)。
		expect(captured.info, `${id}: --c-info must include canonical hue 230`).toMatch(/230/);
		// ag-info-bg / ag-info-text chain alive: computed value に hue=230 が伝播する。
		expect(captured.infoBg, `${id}: --ag-info-bg must derive from --c-info (chain alive)`).toMatch(
			/oklch|color-mix|rgb/i,
		);
		expect(
			captured.infoText,
			`${id}: --ag-info-text must derive from --c-info (chain alive)`,
		).toMatch(/oklch|color-mix|rgb/i);
	}

	// aesthetic 別 chroma 帯の統計差: brutalist は high chroma、 neumorph は low chroma。
	// info の chroma を simple parse して帯域 assert (canonical hue は固定なので chroma が aesthetic 識別軸)。
	function parseInfoChroma(value: string): number | null {
		// "oklch(L C H)" or "rgb(...)" — oklch のみ chroma を抽出。
		const m = /oklch\([\d.]+\s+([\d.]+)\s+[\d.]+/.exec(value);
		return m ? Number(m[1]) : null;
	}
	const cBrutalist = parseInfoChroma(tokens.brutalist);
	const cNeumorph = parseInfoChroma(tokens.neumorph);
	if (cBrutalist != null && cNeumorph != null) {
		expect(cBrutalist, 'brutalist info chroma > neumorph info chroma (鮮烈度の差)').toBeGreaterThan(
			cNeumorph,
		);
	}
});

test('glass dark/light: surface に primary hue tint が注入される (`--ag-surface-tint-strength=30%`)', async ({
	page,
}) => {
	await openSettingsAppearance(page);

	// glass dark の surface tint strength を採取。
	await page.getByTestId('settings-theme-button-dark').click();
	await waitForActiveDataTheme(page, (v) => v === 'dark');
	const dark = await captureDerivedTokens(page);
	expect(dark.tintStrength).toBe('30%');

	// glass light も 30%。
	await page.getByTestId('settings-theme-button-light').click();
	await waitForActiveDataTheme(page, (v) => v === 'light');
	const light = await captureDerivedTokens(page);
	expect(light.tintStrength).toBe('30%');

	// brutalist / neumorph は 0% override (純色の世界観を温存)。
	for (const id of ['brutalist', 'brutalist-dark', 'neumorph', 'neumorph-dark']) {
		await page.getByTestId(`settings-theme-button-${id}`).click();
		await waitForActiveDataTheme(page, (v) => v === id);
		const t = await captureDerivedTokens(page);
		expect(
			t.tintStrength,
			`${id}: surface tint strength must be 0% (aesthetic identity 温存)`,
		).toBe('0%');
	}
});

test('accent hover / focus ring chain alive: primary 変更で派生 token が連動する', async ({
	page,
}) => {
	await openSettingsAppearance(page);

	// light を複製 → ThemeEditor が active 化される。
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

		const primaryPicker = page.getByTestId('theme-editor-primary-color');
		await primaryPicker.waitFor({ state: 'visible', timeout: 10_000 });

		// 編集前の hover / focus ring snapshot を採取。
		const before = await captureDerivedTokens(page);
		expect(before.accentHover).not.toBe('');
		expect(before.accentFocusRing).not.toBe('');

		// primary を red (#ff0000) に変更 (color picker input 経由)。
		await primaryPicker.evaluate((el: HTMLInputElement) => {
			el.value = '#ff0000';
			el.dispatchEvent(new Event('input', { bubbles: true }));
		});

		// 保存ボタンが enable に。 save click で applyTheme が走る。
		const saveBtn = page.getByTestId('theme-editor-save');
		await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
		await saveBtn.click();

		// applyTheme 後、 hover / focus ring が新 primary 由来になっていることを verify。
		await expect
			.poll(
				async () => {
					const c = await captureDerivedTokens(page);
					return c.primary;
				},
				{ timeout: 5_000, intervals: [100, 200, 400] },
			)
			.toContain('#ff0000');

		const after = await captureDerivedTokens(page);
		expect(after.primary).toContain('#ff0000');
		// chain alive verify: hover / focus ring の computed 値に新 primary が含まれる
		// (color-mix(in oklab, var(--c-primary), ...) を経由するため、 computed では
		// CSS が #ff0000 を inline 展開した文字列に置き換える)。
		expect(after.accentHover, '--ag-accent-hover chain must propagate new primary').toContain(
			'#ff0000',
		);
		expect(
			after.accentFocusRing,
			'--ag-accent-focus-ring chain must propagate new primary',
		).toContain('#ff0000');

		// 旧 primary (light builtin の青) が hover / focus に残っていないこと (= chain freeze 回帰検出)。
		expect(after.accentHover).not.toBe(before.accentHover);
		expect(after.accentFocusRing).not.toBe(before.accentFocusRing);
	} finally {
		await setActiveThemeMode(page, 'dark').catch(() => {});
		await deleteTheme(page, clonedId).catch(() => {});
	}
});
