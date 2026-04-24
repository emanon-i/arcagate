import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/tauri.js';

async function openSettings(page: Page) {
	await page.getByRole('button', { name: 'Settings' }).click();
	await expect(page.getByRole('dialog')).toBeVisible();
}

async function openSettingsTab(page: Page, tabLabel: string) {
	await openSettings(page);
	const tablist = page.getByRole('tablist', { name: '設定カテゴリ' });
	await tablist.getByRole('tab', { name: tabLabel }).click();
}

test.describe('設定パネル', () => {
	// Settings ダイアログを開いたままにするテストがあるため、各テスト後に確実に閉じる
	test.afterEach(async ({ page }) => {
		const closeBtn = page.getByRole('button', { name: '設定を閉じる' });
		if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
			await closeBtn.click();
		}
	});

	test('設定パネルが TitleBar から開閉できること', { tag: '@smoke' }, async ({ page }) => {
		await openSettings(page);
		// ✕ ボタンで閉じる（keyboard Escape は dialog div がフォーカスを持つ必要があるため button を使用）
		await page.getByRole('button', { name: '設定を閉じる' }).click();
		await expect(page.getByRole('dialog')).not.toBeVisible();
	});

	test('Settings 2ペインカテゴリナビが機能すること', { tag: '@smoke' }, async ({ page }) => {
		await openSettings(page);

		const tablist = page.getByRole('tablist', { name: '設定カテゴリ' });
		await expect(tablist).toBeVisible();

		// 全カテゴリタブが表示されている
		for (const label of ['一般', 'ワークスペース', '外観', 'サウンド', 'データ']) {
			await expect(tablist.getByRole('tab', { name: label })).toBeVisible();
		}

		// 外観タブをクリックすると外観パネルが表示される
		await tablist.getByRole('tab', { name: '外観' }).click();
		await expect(page.locator('#settings-panel-appearance')).toBeVisible();

		// サウンドタブに切り替わる
		await tablist.getByRole('tab', { name: 'サウンド' }).click();
		await expect(page.locator('#settings-panel-sound')).toBeVisible();
	});

	test('ホットキー入力が recording 状態になること', async ({ page }) => {
		await openSettings(page);

		await page.getByRole('button', { name: '変更' }).click();
		await expect(page.locator('input[aria-label="ホットキー表示"]')).toHaveValue(
			'キーを押してください...',
		);

		await page.getByRole('button', { name: 'キャンセル' }).click();
		await expect(page.locator('input[aria-label="ホットキー表示"]')).not.toHaveValue(
			'キーを押してください...',
		);
	});

	test('テーマボタンが表示されていること', async ({ page }) => {
		await openSettingsTab(page, '外観');

		await expect(page.getByRole('button', { name: 'フラット ダーク' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'フラット ライト' })).toBeVisible();
	});

	test('テーマプリセット（Endfield・Ubuntu Frosted）が外観セクションに表示されること', async ({
		page,
	}) => {
		await openSettingsTab(page, '外観');

		const appearancePanel = page.locator('#settings-panel-appearance');
		await expect(appearancePanel.getByRole('button', { name: 'Endfield' })).toBeVisible();
		await expect(appearancePanel.getByRole('button', { name: 'Ubuntu Frosted' })).toBeVisible();
	});

	test('テーマプリセット選択後に CSS 変数が切り替わること', async ({ page }) => {
		await openSettingsTab(page, '外観');

		const appearancePanel = page.locator('#settings-panel-appearance');

		// Endfield を選択
		await appearancePanel.getByRole('button', { name: 'Endfield' }).click();

		// Endfield の accent 色（#00c8e0）が CSS 変数に反映される
		const accentColor = await page.evaluate(() =>
			getComputedStyle(document.documentElement).getPropertyValue('--ag-accent').trim(),
		);
		expect(accentColor).toBe('#00c8e0');

		// フラット ダーク に戻す
		await appearancePanel.getByRole('button', { name: 'フラット ダーク' }).click();
	});

	test('テーマを切り替えられること', async ({ page }) => {
		await openSettingsTab(page, '外観');

		const appearancePanel = page.locator('#settings-panel-appearance');
		const htmlEl = page.locator('html');
		const isDark = await htmlEl.evaluate((el) => el.classList.contains('dark'));

		if (isDark) {
			await appearancePanel.getByRole('button', { name: 'フラット ライト' }).click();
			await expect(htmlEl).not.toHaveClass(/dark/);
			await appearancePanel.getByRole('button', { name: 'フラット ダーク' }).click();
		} else {
			await appearancePanel.getByRole('button', { name: 'フラット ダーク' }).click();
			await expect(htmlEl).toHaveClass(/dark/);
			await appearancePanel.getByRole('button', { name: 'フラット ライト' }).click();
		}
	});

	test('サウンド ON/OFF トグルが切り替わること', async ({ page }) => {
		await openSettingsTab(page, 'サウンド');

		const soundPanel = page.locator('#settings-panel-sound');
		await expect(soundPanel).toBeVisible();

		const toggle = soundPanel.getByRole('switch');
		const initialChecked = await toggle.getAttribute('aria-checked');

		await toggle.click();
		const newChecked = await toggle.getAttribute('aria-checked');
		expect(newChecked).not.toBe(initialChecked);

		if (newChecked === 'false') {
			await expect(soundPanel.getByRole('slider')).not.toBeVisible();
		} else {
			await expect(soundPanel.getByRole('slider')).toBeVisible();
		}
	});

	test(
		'現在のテーマを複製でカスタムテーマが作成されること',
		{ tag: '@smoke' },
		async ({ page }) => {
			await openSettingsTab(page, '外観');
			const appearancePanel = page.locator('#settings-panel-appearance');

			// テーマ複製ボタンをクリック
			await appearancePanel.getByRole('button', { name: '現在のテーマを複製' }).click();

			// 「のコピー」を含むボタンが外観パネルに現れる（カスタムテーマ作成確認）
			await expect(appearancePanel.getByRole('button', { name: /のコピー/ })).toBeVisible();

			// テーマエディタが開く（編集UIが表示される）
			await expect(appearancePanel.getByText('を編集')).toBeVisible();

			// 後始末: ThemeEditor の削除ボタンで作成テーマを削除（リトライ時の重複防止）
			await appearancePanel.getByRole('button', { name: '削除' }).click();
			await appearancePanel.getByRole('button', { name: '本当に削除' }).click();
			// 削除後 activeMode が 'dark' にリセットされる
			await expect(appearancePanel.getByRole('button', { name: /のコピー/ })).not.toBeVisible();
		},
	);

	test('カスタムテーマの編集ボタンでエディタが開閉できること', async ({ page }) => {
		await openSettingsTab(page, '外観');
		const appearancePanel = page.locator('#settings-panel-appearance');

		// 複製してカスタムテーマを作成
		await appearancePanel.getByRole('button', { name: '現在のテーマを複製' }).click();
		await expect(appearancePanel.getByText('を編集')).toBeVisible();

		// 閉じるボタンで閉じる
		await appearancePanel.getByRole('button', { name: '閉じる' }).click();
		await expect(appearancePanel.getByText('を編集')).not.toBeVisible();

		// 後始末: 編集ボタンで再度開いて削除
		await appearancePanel.getByRole('button', { name: '編集' }).click();
		await appearancePanel.getByRole('button', { name: '削除' }).click();
		await appearancePanel.getByRole('button', { name: '本当に削除' }).click();
	});

	test('JSON からインポートリンクがクリックできること', { tag: '@smoke' }, async ({ page }) => {
		await openSettingsTab(page, '外観');
		const appearancePanel = page.locator('#settings-panel-appearance');

		await appearancePanel.getByText('JSON からインポート').click();
		await expect(appearancePanel.getByRole('textbox')).toBeVisible();
	});

	test('サウンド ON 時に音量スライダーが表示されること', async ({ page }) => {
		await openSettingsTab(page, 'サウンド');

		const soundPanel = page.locator('#settings-panel-sound');
		const toggle = soundPanel.getByRole('switch');

		const isOn = (await toggle.getAttribute('aria-checked')) === 'true';
		if (!isOn) {
			await toggle.click();
			await expect(toggle).toHaveAttribute('aria-checked', 'true');
		}

		const slider = soundPanel.getByRole('slider');
		await expect(slider).toBeVisible();

		const val = await slider.getAttribute('value');
		const num = parseFloat(val ?? '0');
		expect(num).toBeGreaterThanOrEqual(0);
		expect(num).toBeLessThanOrEqual(1);
	});
});
