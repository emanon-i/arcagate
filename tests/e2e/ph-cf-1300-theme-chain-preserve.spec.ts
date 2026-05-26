/**
 * DEV_REVIEW_R4 ⑪ + ⑫(b) 実装の実 UI / 実描画レベル機械検証。
 *
 * 検証対象:
 *  - ⑪: ThemeEditor の dirty トラッキング fix。 LAYER 2 (`--ag-*`) が default で JSON に
 *    保存されなくなり、 `--ag-accent: var(--c-primary)` CSS 動的 chain が温存される。
 *    e2e は「複製 → primary を別色に変更 → 保存」 後の computed style で `--c-primary` と
 *    `--ag-accent` 系派生 token が **連動** していることを実描画レベルで verify。
 *    `source === cloned` 同語反復は禁止 (audit doc §2.5 推奨案 C)。
 *
 *  - ⑫(b): randomize aesthetic 推定。 brutalist active で randomize を click した直後の
 *    `--c-primary` が brutalist の chroma レンジ (≧0.18) に入る = RGB spread の統計差が出る
 *    ことを実描画レベルで verify (glass レンジに偏らないこと)。
 *
 * 引用元:
 *  docs/l3_phases/audit/DEV_REVIEW_R4_THREE_DEFECTS_2026-05-27.md
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
 * `<html>` 上の computed `--c-primary` と `--ag-accent` 系派生 token を採取。
 * `--ag-accent` は `var(--c-primary)` を、 `--ag-accent-bg` / `--ag-accent-border` は
 * `color-mix(in oklab, var(--c-primary), transparent ...)` を経由する。 CSS chain が生きていれば
 * primary を変更したら全派生 token が一斉に変わる。 chain 切断状態では `--ag-accent` 等が
 * **literal 凍結値 (`oklch(0.50 0.14 215)` 等)** のまま取り残される (= audit doc §2.1 で実測
 * した症状の再現性 verify)。
 */
async function captureAccentChain(page: Page): Promise<{
	primary: string;
	accent: string;
	accentText: string;
	accentBg: string;
	accentBorder: string;
}> {
	return page.evaluate(() => {
		const cs = getComputedStyle(document.documentElement);
		return {
			primary: cs.getPropertyValue('--c-primary').trim(),
			accent: cs.getPropertyValue('--ag-accent').trim(),
			accentText: cs.getPropertyValue('--ag-accent-text').trim(),
			accentBg: cs.getPropertyValue('--ag-accent-bg').trim(),
			accentBorder: cs.getPropertyValue('--ag-accent-border').trim(),
		};
	});
}

test('⑪: custom theme で primary を変更すると `--ag-accent` 系派生 token が連動する (chain 温存)', async ({
	page,
}) => {
	// 1. 設定 → 外観 で light builtin を複製 → 新 custom が active 化される。
	await openSettingsAppearance(page);
	await page.getByTestId('settings-theme-button-light').click();
	await waitForActiveDataTheme(page, (v) => v === 'light');

	const customsBefore = (await listThemes(page)).filter((t) => !t.is_builtin).length;
	await page.getByTestId('settings-theme-clone-light').click();
	const clonedId = await waitForActiveDataTheme(
		page,
		(v) => Boolean(v) && v !== 'light' && v !== 'dark',
	);
	expect(clonedId).toMatch(/^[0-9a-f]{8}-/);

	try {
		await expect
			.poll(async () => (await listThemes(page)).filter((t) => !t.is_builtin).length, {
				timeout: 5_000,
			})
			.toBe(customsBefore + 1);

		// 2. ThemeEditor が dynamic import で開いている。 primary picker が visible に。
		const primaryPicker = page.getByTestId('theme-editor-primary-color');
		await primaryPicker.waitFor({ state: 'visible', timeout: 10_000 });

		// 3. 編集前の chain snapshot を採取。 primary と派生 accent が「同 primary 由来」 で派生
		// していることを verify (chain alive baseline)。
		const before = await captureAccentChain(page);
		expect(before.accent).toContain(before.primary);
		expect(before.accentBg).toContain(before.primary);

		// 4. primary を red (#ff0000) に変更 (color picker `input` イベント発火)。
		await primaryPicker.evaluate((el: HTMLInputElement) => {
			el.value = '#ff0000';
			el.dispatchEvent(new Event('input', { bubbles: true }));
		});

		// 5. 保存ボタンが enable になっている (dirty=true)。 click で保存。
		const saveBtn = page.getByTestId('theme-editor-save');
		await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
		await saveBtn.click();

		// 6. 保存後、 applyTheme が JSON を inline style に書き戻す → chain は維持されるはず。
		//    primary は新値 (#ff0000)、 accent 系派生 token に #ff0000 が含まれていることを verify。
		await expect
			.poll(
				async () => {
					const c = await captureAccentChain(page);
					return c.primary;
				},
				{ timeout: 5_000, intervals: [100, 200, 400] },
			)
			.toContain('#ff0000');

		const after = await captureAccentChain(page);
		expect(after.primary).toContain('#ff0000');
		// chain alive: 各派生 token は `var(--c-primary)` ベースで computed されるため、
		// computed value 内に #ff0000 が含まれる (color-mix() 形式 / 直接代入 形式の両方を許容)。
		expect(after.accent).toContain('#ff0000');
		expect(after.accentBg).toContain('#ff0000');
		expect(after.accentBorder).toContain('#ff0000');
		expect(after.accentText).toContain('#ff0000');

		// 7. **回帰検出の本丸**: 編集前の primary 値 (blue 由来) が **派生 token に残っていない**。
		//    これが残っていたら chain 切断 = audit doc §2.1 と同じ症状を再現していることになる。
		expect(after.accent).not.toContain(before.primary);
		expect(after.accentBg).not.toContain(before.primary);
		expect(after.accentBorder).not.toContain(before.primary);
	} finally {
		await setActiveThemeMode(page, 'dark').catch(() => {});
		await deleteTheme(page, clonedId).catch(() => {});
	}
});

test('⑫(b): brutalist clone で randomize を click → primary が brutalist 範囲で変化する (UI 経路 wiring)', async ({
	page,
}) => {
	// brutalist の AESTHETIC_RANGE (utils/color.ts): { c: [0.18, 0.28], l: [0.55, 0.65] }
	// glass の AESTHETIC_RANGE:                       { c: [0.16, 0.22], l: [0.58, 0.70] }
	//
	// 旧 hardcode で `'glass'` を使う実装では brutalist active でも glass レンジしか出ない。
	// 新実装は detectAesthetic(theme) で brutalist を返し、 randomSeedPair が brutalist レンジで
	// 生成する。 本 spec は wiring (= detectAesthetic 結果が randomize() に渡る) を実 UI で verify。
	// brutalist vs glass の chroma 帯統計差は `src/lib/utils/color.test.ts` の unit test 側でカバー。
	await openSettingsAppearance(page);

	// brutalist builtin を active → 複製 → ThemeEditor open。
	await page.getByTestId('settings-theme-button-brutalist').click();
	await waitForActiveDataTheme(page, (v) => v === 'brutalist');

	await page.getByTestId('settings-theme-clone-brutalist').click();
	const clonedId = await waitForActiveDataTheme(
		page,
		(v) => Boolean(v) && v !== 'brutalist' && v !== 'dark' && v !== 'light',
	);

	try {
		const randomBtn = page.getByTestId('theme-editor-random');
		await randomBtn.waitFor({ state: 'visible', timeout: 10_000 });
		const primaryPicker = page.getByTestId('theme-editor-primary-color');

		// 8 回 sampling して、 brutalist の高 chroma 特性 (= RGB spread >= 0.45 が多数派) が現れる
		// ことを verify。 glass hardcode 時は spread が <0.45 に偏る統計差。 unit test と二段で
		// chain (detectAesthetic → randomSeedPair) の wiring を実 UI で押さえる。
		let highChromaCount = 0;
		const total = 8;
		for (let i = 0; i < total; i++) {
			await randomBtn.click();
			await page.waitForTimeout(50);
			const hex = await primaryPicker.inputValue();
			const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
			if (!m) continue;
			const r = Number.parseInt(m[1], 16) / 255;
			const g = Number.parseInt(m[2], 16) / 255;
			const b = Number.parseInt(m[3], 16) / 255;
			const spread = Math.max(r, g, b) - Math.min(r, g, b);
			if (spread >= 0.45) highChromaCount++;
		}
		// brutalist は chroma 0.18-0.28 で生成されるため、 高 chroma sample が過半数になる。
		// glass hardcode (chroma 0.16-0.22) では同じ 8 sample で過半数到達は確率的に困難。
		expect(
			highChromaCount,
			`brutalist active で randomize しても高 chroma sample が過半数にならない (= glass hardcode 回帰、 ${highChromaCount}/${total})`,
		).toBeGreaterThanOrEqual(5);
	} finally {
		await setActiveThemeMode(page, 'dark').catch(() => {});
		await deleteTheme(page, clonedId).catch(() => {});
	}
});
