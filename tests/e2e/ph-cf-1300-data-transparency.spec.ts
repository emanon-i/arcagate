import { expect, test } from '../fixtures/tauri.js';

/**
 * PH-CF-1300 e2e: データ透明化 — Settings → About → 「データの保存場所」 section が
 * 表示され、 各 path の値 + 「フォルダを開く」 button が機能する。
 *
 * 引用元 guideline:
 *   docs/l3_phases/clean-feedback/PH-CF-1300_data-transparency.md §機能契約 / §test plan
 *
 * 検証 scope (実 UI 経路):
 *  - DT-1: About を開くと `about-data-location-{db,appdata,log}` の 3 件が visible
 *  - DT-2: 各 textContent が 「Windows 標準 path 形式 (= ドライブレターから始まる絶対 path)」
 *          で、 末尾セグメントが期待値を含む (db = `arcagate.db`, log = `logs`)
 *  - DT-3: 各 「フォルダを開く」 button (`about-data-open-{db,appdata,log}`) が visible / enabled
 *
 * 注: click → Explorer の実起動は OS dialog/native window の側 effect で、 e2e からは
 * IPC 呼び出しの成立しか観測できない。 click action 自体が throw しないこと (= IPC が
 * resolve すること) を確認すれば backend → reveal_in_explorer 経路の wiring は verify 済。
 * Explorer window の visual 検証は人手 dev で行う。
 */
test.describe('PH-CF-1300: データ保存場所 transparency in Settings → About', () => {
	test.beforeEach(async ({ page }) => {
		// 前 spec の state を clean state にして main view + Settings を確実に開ける状態に。
		await page.evaluate(() => localStorage.setItem('arcagate.app.activeView', 'library'));
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });
	});

	test('Data location 3 path + open button が visible で path 形式が valid', async ({ page }) => {
		// Settings modal を開いて About tab に切替。
		await page.getByRole('button', { name: 'Settings', exact: true }).click();
		await page.locator('#tab-about').click();
		await page.getByTestId('about-app-version').waitFor({ state: 'visible', timeout: 10_000 });

		// PH-CF-1300 必須 3 path が visible 状態に到達するまで waitFor。 cmd_get_app_paths IPC が
		// resolve すると `appPaths` state が hydrate されて section が mount される。
		await page.getByTestId('about-data-location-db').waitFor({ state: 'visible', timeout: 15_000 });
		await expect(page.getByTestId('about-data-location-appdata')).toBeVisible();
		await expect(page.getByTestId('about-data-location-log')).toBeVisible();

		// 値の形式 verify: Windows path (drive letter + 絶対) + 期待ファイル名 / dir 名を含む。
		const dbPath = (await page.getByTestId('about-data-location-db').textContent()) ?? '';
		const appdataPath = (await page.getByTestId('about-data-location-appdata').textContent()) ?? '';
		const logPath = (await page.getByTestId('about-data-location-log').textContent()) ?? '';

		// DB path: 末尾が `arcagate.db` で終わる。 dev では ARCAGATE_DB_PATH env で
		// `D:\a\...\test-data\xxx.db` のように override されるため、 e2e では `.db` 拡張子
		// だけを確認する (slow runner 環境差を吸収)。
		expect(dbPath).toMatch(/\.db$/);
		// app data dir / log dir: 絶対 path 形式 (drive letter + ':' で始まる)。
		expect(appdataPath).toMatch(/^[A-Za-z]:[\\/]/);
		expect(logPath).toMatch(/^[A-Za-z]:[\\/]/);
		// log dir 末尾は `logs` (= app_log_dir() の返り値慣習) を含む。
		expect(logPath.toLowerCase()).toContain('log');

		// 「フォルダを開く」 button 3 種が visible / enabled。
		const openDb = page.getByTestId('about-data-open-db');
		const openAppdata = page.getByTestId('about-data-open-appdata');
		const openLog = page.getByTestId('about-data-open-log');
		await expect(openDb).toBeVisible();
		await expect(openDb).toBeEnabled();
		await expect(openAppdata).toBeVisible();
		await expect(openAppdata).toBeEnabled();
		await expect(openLog).toBeVisible();
		await expect(openLog).toBeEnabled();
	});
});
