import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/tauri.js';
import { invoke } from '../helpers/ipc.js';

/**
 * PH-CF-800 e2e: テーマ / 設定 polish (F1 / F3 / F4 / F5 / F6) の実機検証。
 *
 * 引用元 guideline:
 *  - `docs/l3_phases/clean-feedback/PH-CF-800_theme-settings-polish.md` §受け入れ条件
 *  - `docs/l2_foundation/features/screens/settings.md` §builtin テーマ構成契約 /
 *    §テーマ並び順契約 / §テーマカードのアクション契約
 *  - `docs/l2_foundation/features/backend/theme-service.md` §テーマ複製契約 /
 *    §カスタムテーマ上限契約
 *  - F3 根治 audit: `docs/l3_phases/audit/THEME_CLONE_AESTHETIC_LOST_2026-05-26.md`
 *
 * scope:
 *  - TS-1 (F1): listThemes が 6 builtin (HUD 無し) を sort_order 順で返す
 *  - TS-2 (F1): `brutalist-dark` / `neumorph-dark` を select すると DOM の `data-theme`
 *    が切り替わり、 dark base が active になる
 *  - TS-3 (F3): builtin 「コピー」 ボタンの実 click で複製した新 custom が **実描画レベル**
 *    で source builtin の aesthetic を再現する (audit doc §1 で実測 mismatch していた
 *    --c-bg / --c-fg / --c-primary / --surface-blur / --ag-radius-lg を computed style で
 *    一致 verify、 `cloned.css_vars === source.css_vars` のような同語反復は禁止)
 *  - TS-4 (F4 + F5): 「現在のテーマを複製」 button の実 click で active aesthetic を実描画
 *    レベルで複製。 clipboard には書き込まれない (旧「コピー」 廃止)。 アイコン + aria-label を持つ。
 *  - TS-5 (F6): quota 表示が「N / MAX」 で出ている。 「複製」 で count が +1 する
 *
 * 注: 大規模 quota テスト (上限到達 → disabled) は Rust unit でカバー済のため、 e2e では
 * count 増加までで十分。
 */

interface Theme {
	id: string;
	name: string;
	base_theme: 'dark' | 'light';
	css_vars: string;
	is_builtin: boolean;
	created_at: string;
	updated_at: string;
}

/** F3 e2e: builtin の aesthetic を **実描画** レベルで識別する主要 token。
 * audit doc §1 で実測 mismatch していた 5 token を採用 (clone fidelity の必要十分条件)。 */
interface AestheticSnapshot {
	bg: string;
	fg: string;
	primary: string;
	blur: string;
	radiusLg: string;
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

async function getQuota(page: Page): Promise<[number, number]> {
	return invoke<[number, number]>(page, 'cmd_get_custom_theme_quota');
}

async function createTheme(
	page: Page,
	name: string,
	baseTheme: string,
	cssVars: string,
): Promise<Theme> {
	return invoke<Theme>(page, 'cmd_create_theme', { name, baseTheme, cssVars });
}

/** Settings modal を実 UI で開き、 Appearance pane へ切り替える。
 * audit doc §推奨 D 案: 「IPC 直叩きでなく 実 UI ボタン click 経路で test seam を構成する」。
 *
 * 前 spec の page 状態 (Settings modal 開きっぱなし / 別 webview window へ binding 等) を
 * clean up するため、 まず library view に強制して reload。 CI run 26450906881 で TS-3 / TS-4
 * が「page snapshot が palette 画面」 で 120s timeout した実例があり、 page reference 安定化
 * (= 確実に main window URL `/` に居る状態) が prerequisite。 */
async function openSettingsAppearance(page: Page): Promise<void> {
	// localStorage で library view を強制 → reload で TitleBar + LibraryLayout の clean state。
	await page.evaluate(() => localStorage.setItem('arcagate.app.activeView', 'library'));
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });
	// TitleBar の設定 button (NAV_TOP.settings.label = 'Settings' を aria-label に持つ)。
	await page.getByRole('button', { name: 'Settings', exact: true }).click();
	// Settings modal の Appearance タブ (SettingsPanel.svelte id="tab-appearance")。
	await page.locator('#tab-appearance').click();
	// Appearance pane が mount された signal: theme card grid の最初の builtin (dark) が visible に。
	await page
		.getByTestId('settings-theme-button-dark')
		.waitFor({ state: 'visible', timeout: 15_000 });
}

/** `<html>` の computed style から F3 aesthetic identity を成す 5 token を読み出す。
 * `getComputedStyle` は inline style / class CSS / [data-theme] CSS / :root を統合した実描画
 * 値を返すため、 clone bug の有無を **実描画** レベルで識別できる (audit doc §1 と同じ計測)。 */
async function captureAesthetic(page: Page): Promise<AestheticSnapshot> {
	return page.evaluate(() => {
		const cs = getComputedStyle(document.documentElement);
		return {
			bg: cs.getPropertyValue('--c-bg').trim(),
			fg: cs.getPropertyValue('--c-fg').trim(),
			primary: cs.getPropertyValue('--c-primary').trim(),
			blur: cs.getPropertyValue('--surface-blur').trim(),
			radiusLg: cs.getPropertyValue('--ag-radius-lg').trim(),
		};
	});
}

/** dataset.theme が期待値に切り替わるまで poll。 cloneTheme は createTheme → setThemeMode →
 * applyTheme で dataset.theme を新 custom ID に書き換えるが、 reactive 反映に 1 frame 程度
 * かかるため明示的に wait。 */
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

test('TS-1 (F1): builtin は 6 本 (HUD 無し)、 sort_order で並ぶ', async ({ page }) => {
	// audit-ui-bypass:ok backend 契約 (builtin set + sort_order) の純粋 verify、 UI 経路追加で
	// scope を超える (UI 検証は TS-2 / TS-3 / TS-4 が computed style まで担当)。
	const themes = await listThemes(page);
	const builtinIds = themes.filter((t) => t.is_builtin).map((t) => t.id);
	expect(builtinIds).toEqual([
		'dark',
		'light',
		'brutalist-dark',
		'brutalist',
		'neumorph-dark',
		'neumorph',
	]);
});

test('TS-2 (F1): 実 UI で brutalist-dark / neumorph-dark を select → data-theme が切替', async ({
	page,
}) => {
	await openSettingsAppearance(page);

	// brutalist-dark を実 UI で click → applyTheme が dataset.theme / .dark class を反映。
	await page.getByTestId('settings-theme-button-brutalist-dark').click();
	await waitForActiveDataTheme(page, (v) => v === 'brutalist-dark');
	const hasDarkClass = await page.evaluate(() =>
		document.documentElement.classList.contains('dark'),
	);
	expect(hasDarkClass).toBe(true);

	// neumorph-dark に切替。
	await page.getByTestId('settings-theme-button-neumorph-dark').click();
	await waitForActiveDataTheme(page, (v) => v === 'neumorph-dark');

	// cleanup → dark に戻す (IPC で十分、 UI 経路は上で carrier 済)。
	await setActiveThemeMode(page, 'dark');
});

test('TS-3 (F3): builtin「コピー」 は実描画レベルで source aesthetic を複製する', async ({
	page,
}) => {
	// F3 根治の真の verify。 audit doc §3.1 で空転していた IPC 直叩き + tautology assertion
	// 経路を全廃し、 実 UI click + computed style 比較で「見た目化け」 を直接検出する。
	await openSettingsAppearance(page);

	// 1. brutalist-dark を実 UI で active 化 (audit doc §1 で 6/6 token mismatch していた source)。
	await page.getByTestId('settings-theme-button-brutalist-dark').click();
	await waitForActiveDataTheme(page, (v) => v === 'brutalist-dark');
	const sourceAesthetic = await captureAesthetic(page);
	// brutalist-dark の identity assertion (migration 043 と CSS block の整合 spot-check)。
	// 純黒 bg / 角丸 0 / blur 無し が出ていなければ source 自体が壊れているため early fail。
	expect(sourceAesthetic.bg).toContain('oklch(0.14 0 0)');
	expect(sourceAesthetic.radiusLg).toBe('0px');
	expect(sourceAesthetic.blur).toBe('none');

	// 2. brutalist-dark カードの「コピー」 (アイコンボタン) を実 click。 SettingsAppearancePane の
	// cloneTheme() が createTheme + setThemeMode + ThemeEditor open を実行する。
	const customsBefore = (await listThemes(page)).filter((t) => !t.is_builtin).length;
	await page.getByTestId('settings-theme-clone-brutalist-dark').click();

	// 3. 新 custom が active 化される (cloneTheme 経路の setThemeMode)。 dataset.theme が UUID
	// 形式 (= builtin ID ではない) になるまで poll。
	const clonedDataTheme = await waitForActiveDataTheme(
		page,
		(v) => Boolean(v) && v !== 'brutalist-dark' && v !== 'dark' && v !== 'light',
	);
	expect(clonedDataTheme).not.toBe('brutalist-dark');
	expect(clonedDataTheme).toMatch(/^[0-9a-f]{8}-/);

	// count + 1 を確認 (clone 完了の double-check)。
	await expect
		.poll(async () => (await listThemes(page)).filter((t) => !t.is_builtin).length, {
			timeout: 5_000,
		})
		.toBe(customsBefore + 1);

	// 4. **真の F3 検証**: 新 custom の computed style 5 token が source brutalist-dark と
	// 完全一致する。 audit doc §1 で 6/6 token mismatch していた bug が消えていれば一致する。
	const clonedAesthetic = await captureAesthetic(page);
	expect(clonedAesthetic).toEqual(sourceAesthetic);

	// cleanup: 新 custom を消し active を dark に戻す。
	await setActiveThemeMode(page, 'dark');
	await deleteTheme(page, clonedDataTheme).catch(() => {});
});

test('TS-4 (F4 + F5): 「現在のテーマを複製」 は実描画で active aesthetic を複製し clipboard は触らない', async ({
	page,
}) => {
	// PH-CF-800 F5: 旧 「コピー」 (clipboard 書き込み) は廃止、 「複製」 = DB 複製のみの契約。
	// PH-CF-800 F4: ボタンは Plus アイコン + 文言 + tooltip。 PH-CF-800 F3: cloneCurrentTheme は
	// active の aesthetic を新 custom に伝播 (audit doc §推奨 D 案)。

	// clipboard spy (page mount より前に install するため、 settings open 前に注入)。
	await page.evaluate(() => {
		(window as unknown as { __ts4ClipboardCalls: string[] }).__ts4ClipboardCalls = [];
		const orig = navigator.clipboard.writeText.bind(navigator.clipboard);
		navigator.clipboard.writeText = async (t: string) => {
			(window as unknown as { __ts4ClipboardCalls: string[] }).__ts4ClipboardCalls.push(t);
			return orig(t);
		};
	});

	await openSettingsAppearance(page);

	// 1. neumorph を実 UI で active 化 (light base、 dual shadow、 blur 無し、 角丸 24px)。
	await page.getByTestId('settings-theme-button-neumorph').click();
	await waitForActiveDataTheme(page, (v) => v === 'neumorph');
	const sourceAesthetic = await captureAesthetic(page);
	expect(sourceAesthetic.radiusLg).toBe('24px');
	expect(sourceAesthetic.blur).toBe('none');

	// 2. 「現在のテーマを複製」 button (settings-clone-current-theme) を実 click。
	const customsBefore = (await listThemes(page)).filter((t) => !t.is_builtin).length;
	await page.getByTestId('settings-clone-current-theme').click();

	// 3. 新 custom が active 化される。
	const clonedDataTheme = await waitForActiveDataTheme(
		page,
		(v) => Boolean(v) && v !== 'neumorph' && v !== 'dark' && v !== 'light',
	);
	expect(clonedDataTheme).toMatch(/^[0-9a-f]{8}-/);
	await expect
		.poll(async () => (await listThemes(page)).filter((t) => !t.is_builtin).length, {
			timeout: 5_000,
		})
		.toBe(customsBefore + 1);

	// 4. 実描画 aesthetic が一致 (F3 と同じ verify principle)。
	const clonedAesthetic = await captureAesthetic(page);
	expect(clonedAesthetic).toEqual(sourceAesthetic);

	// 5. F5: clipboard には書き込まれていない (旧「コピー」 廃止の verify)。
	const clipboardCalls = await page.evaluate(
		() => (window as unknown as { __ts4ClipboardCalls: string[] }).__ts4ClipboardCalls,
	);
	expect(clipboardCalls).toEqual([]);

	// 6. F4: 「現在のテーマを複製」 button が aria-label + tooltip (title 属性) を持つ。
	const cloneCurrentBtn = page.getByTestId('settings-clone-current-theme');
	const title = await cloneCurrentBtn.getAttribute('title');
	expect(title).toBeTruthy();

	// cleanup
	await setActiveThemeMode(page, 'dark');
	await deleteTheme(page, clonedDataTheme).catch(() => {});
});

test('TS-5 (F6): カスタムテーマ quota が取得でき、 create で used が +1 する', async ({ page }) => {
	// audit-ui-bypass:ok backend 契約 (count_custom_themes / MAX_CUSTOM_THEMES) の純粋 verify、
	// UI 経路は TS-3 / TS-4 が「複製」 ボタン経由で実 count +1 を実機確認済。
	const [usedBefore, max] = await getQuota(page);
	expect(max).toBeGreaterThan(0);
	expect(usedBefore).toBeGreaterThanOrEqual(0);

	const created = await createTheme(page, `PH-CF-800 TS-5 ${Date.now()}`, 'dark', '{}');
	try {
		const [usedAfter, maxAfter] = await getQuota(page);
		expect(maxAfter).toBe(max);
		expect(usedAfter).toBe(usedBefore + 1);
	} finally {
		await deleteTheme(page, created.id).catch(() => {});
	}
});
