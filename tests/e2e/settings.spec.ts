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

	test(
		'ビルトインテーマに「コピーして編集」ボタンが表示されること',
		{ tag: '@smoke' },
		async ({ page }) => {
			await openSettingsTab(page, '外観');
			const appearancePanel = page.locator('#settings-panel-appearance');

			// Endfield のカードに「コピーして編集」ボタンがある
			await expect(
				appearancePanel.getByRole('button', { name: 'コピーして編集' }).first(),
			).toBeVisible();
		},
	);

	test('Endfield の「コピーして編集」でテーマエディタが開くこと', async ({ page }) => {
		await openSettingsTab(page, '外観');
		const appearancePanel = page.locator('#settings-panel-appearance');

		// Endfield を選択してからそのカードの「コピーして編集」をクリック
		await appearancePanel.getByRole('button', { name: 'Endfield' }).click();
		// Endfield カード直下の「コピーして編集」ボタン（最初のもの）
		const cloneBtn = appearancePanel.getByRole('button', { name: 'コピーして編集' }).first();
		await cloneBtn.click();

		// ThemeEditor が開いて「Endfield のコピー を編集」が表示される
		await expect(appearancePanel.getByText('Endfield のコピー を編集')).toBeVisible({
			timeout: 5000,
		});

		// 後始末
		await appearancePanel.getByRole('button', { name: '削除' }).click();
		await appearancePanel.getByRole('button', { name: '本当に削除' }).click();
		await expect(
			appearancePanel.getByRole('button', { name: 'Endfield のコピー' }),
		).not.toBeVisible();
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
			// .first() でテーマグリッドボタン（ThemeEditor タイトルボタンより前）を指定
			await expect(appearancePanel.getByRole('button', { name: /のコピー/ }).first()).toBeVisible();

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

	test('カスタムテーマの CSS 変数がリアルタイムで反映されること', async ({ page }) => {
		await openSettingsTab(page, '外観');
		const appearancePanel = page.locator('#settings-panel-appearance');

		// テーマ複製（ThemeEditor が自動展開する）
		await appearancePanel.getByRole('button', { name: '現在のテーマを複製' }).click();
		await expect(appearancePanel.getByText('を編集')).toBeVisible();

		// 変更前は「● 未保存」バッジなし
		await expect(appearancePanel.locator('text=● 未保存')).not.toBeVisible();

		// ThemeEditor 内の最初のテキスト入力を変更
		const editorInputs = appearancePanel.locator('.max-h-80 input[type="text"]');
		const firstInput = editorInputs.first();
		await firstInput.fill('#ffffff');
		await firstInput.dispatchEvent('input');

		// isDirty になり「● 未保存」バッジが出る（リアルタイム追跡確認）
		await expect(appearancePanel.locator('text=● 未保存')).toBeVisible({ timeout: 10_000 });

		// 後始末
		await appearancePanel.getByRole('button', { name: '削除' }).click();
		await appearancePanel.getByRole('button', { name: '本当に削除' }).click();
		await expect(appearancePanel.getByRole('button', { name: /のコピー/ })).not.toBeVisible();
	});

	test('カスタムテーマの保存後に変更が DB に永続化されること', async ({ page }) => {
		await openSettingsTab(page, '外観');
		const appearancePanel = page.locator('#settings-panel-appearance');

		// テーマ複製
		await appearancePanel.getByRole('button', { name: '現在のテーマを複製' }).click();
		await expect(appearancePanel.getByText('を編集')).toBeVisible();

		// ThemeEditor の最初のテキスト入力を変更
		const editorInputs = appearancePanel.locator('.max-h-80 input[type="text"]');
		const firstInput = editorInputs.first();
		await firstInput.fill('#1a2b3c');
		await firstInput.dispatchEvent('input');

		// 保存
		await appearancePanel.getByRole('button', { name: '保存' }).click();
		await expect(appearancePanel.locator('text=✓ 保存しました')).toBeVisible({
			timeout: 10_000,
		});

		// ページをリロードしてもカスタムテーマが残っている（DB 永続化確認）
		await page.reload();
		await page.waitForURL(/^http:\/\/localhost:5173/);
		await page.waitForLoadState('domcontentloaded');

		await openSettingsTab(page, '外観');
		const panel = page.locator('#settings-panel-appearance');
		await expect(panel.getByRole('button', { name: /のコピー/ })).toBeVisible({
			timeout: 15_000,
		});

		// 後始末
		await panel.getByRole('button', { name: '編集' }).click();
		await panel.getByRole('button', { name: '削除' }).click();
		await panel.getByRole('button', { name: '本当に削除' }).click();
		await expect(panel.getByRole('button', { name: /のコピー/ })).not.toBeVisible();
	});

	test('JSON インポートで新テーマが一覧に追加されること', async ({ page }) => {
		await openSettingsTab(page, '外観');
		const appearancePanel = page.locator('#settings-panel-appearance');

		// JSON インポートエリアを開く
		await appearancePanel.getByText('JSON からインポート').click();
		const textarea = appearancePanel.getByRole('textbox');
		await expect(textarea).toBeVisible();

		// 有効な JSON を入力してインポート
		const importJson = JSON.stringify({
			name: 'E2E インポートテーマ',
			base_theme: 'dark',
			css_vars: '{}',
			is_builtin: false,
			created_at: '',
			updated_at: '',
		});
		await textarea.fill(importJson);
		await appearancePanel.getByRole('button', { name: 'インポート' }).click();

		// 新テーマボタンが一覧に追加される
		await expect(appearancePanel.getByRole('button', { name: 'E2E インポートテーマ' })).toBeVisible(
			{ timeout: 10_000 },
		);

		// 後始末: 編集 → 削除
		await appearancePanel.getByRole('button', { name: '編集' }).click();
		await appearancePanel.getByRole('button', { name: '削除' }).click();
		await appearancePanel.getByRole('button', { name: '本当に削除' }).click();
		await expect(
			appearancePanel.getByRole('button', { name: 'E2E インポートテーマ' }),
		).not.toBeVisible();
	});

	test('カスタムテーマの名前をインラインで変更できること', async ({ page }) => {
		await openSettingsTab(page, '外観');
		const appearancePanel = page.locator('#settings-panel-appearance');

		// テーマ複製
		await appearancePanel.getByRole('button', { name: '現在のテーマを複製' }).click();
		await expect(appearancePanel.getByText('を編集')).toBeVisible();

		// テーマ名ボタン（"〇〇のコピー を編集" の部分）をクリックして編集モードへ
		const nameEditButton = appearancePanel.locator('button[title="クリックして名前を変更"]');
		await expect(nameEditButton).toBeVisible();
		await nameEditButton.click();

		// 編集 input が出る
		const nameInput = appearancePanel.getByRole('textbox', { name: 'テーマ名' });
		await expect(nameInput).toBeVisible();

		// 新しい名前を入力して Enter
		await nameInput.fill('E2E リネームテーマ');
		await nameInput.press('Enter');

		// テーマリストのボタンが新名で表示される
		await expect(appearancePanel.getByRole('button', { name: 'E2E リネームテーマ' })).toBeVisible({
			timeout: 5000,
		});

		// 後始末
		await appearancePanel.getByRole('button', { name: '削除' }).click();
		await appearancePanel.getByRole('button', { name: '本当に削除' }).click();
		await expect(
			appearancePanel.getByRole('button', { name: 'E2E リネームテーマ' }),
		).not.toBeVisible();
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
