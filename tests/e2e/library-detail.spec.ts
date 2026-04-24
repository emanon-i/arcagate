import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { createItem, createTag, deleteItem, deleteTag, toggleStar } from '../helpers/ipc.js';
import { resizeWindow } from '../helpers/resize.js';

test.describe('ライブラリ詳細パネル', () => {
	test('閉じるボタンでパネルが閉じること（#17 修正検証）', { tag: '@smoke' }, async ({ page }) => {
		// lg 幅にして DetailPanel を表示
		await resizeWindow(page, 1280, 800);

		const item = await createItem(page, {
			item_type: 'url',
			label: 'パネル閉じテスト',
			target: 'https://panel-close-test.example.com',
		});

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			// カードをクリックして DetailPanel に表示
			await page.getByTestId(`library-card-${item.id}`).click();

			// DetailPanel にアイテム名が表示される
			const detailWrapper = page.getByTestId('library-detail-wrapper');
			await expect(detailWrapper).toBeVisible();
			const detailPanel = page.getByTestId('library-detail-panel');
			await expect(detailPanel.getByText('パネル閉じテスト')).toBeVisible();

			// 閉じるボタンをクリック
			await detailPanel.getByRole('button', { name: 'パネルを閉じる' }).click();

			// detail-wrapper ごと非表示になる（selectedItemId = null で条件レンダリングが消える）
			await expect(detailWrapper).not.toBeVisible();
		} finally {
			await deleteItem(page, item.id);
		}
	});

	test('無効アイテムがグレーアウトされること（#16 修正検証）', async ({ page }) => {
		const item = await createItem(page, {
			item_type: 'url',
			label: 'グレーアウトテスト',
			target: 'https://grayout-test.example.com',
		});

		try {
			// IPC でアイテムを無効化
			await page.evaluate(
				async ([id]) => {
					await (
						window as unknown as {
							__TAURI_INTERNALS__: { invoke: (cmd: string, args?: unknown) => Promise<unknown> };
						}
					).__TAURI_INTERNALS__.invoke('cmd_update_item', {
						id,
						input: { is_enabled: false },
					});
				},
				[item.id] as [string],
			);

			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			const card = page.getByTestId(`library-card-${item.id}`);
			await expect(card).toBeVisible();

			// opacity-40 と grayscale クラスが付いていること
			const hasGrayout = await card.evaluate((el) => {
				return el.classList.contains('opacity-40') && el.classList.contains('grayscale');
			});
			expect(hasGrayout).toBe(true);
		} finally {
			await deleteItem(page, item.id);
		}
	});

	test('カードのダブルクリックで dblclick イベントが発火すること（#22 修正検証）', async ({
		page,
	}) => {
		const item = await createItem(page, {
			item_type: 'url',
			label: 'ダブルクリックテスト',
			target: 'https://dblclick-test.example.com',
		});

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			const card = page.getByTestId(`library-card-${item.id}`);
			await expect(card).toBeVisible();

			// カードに dblclick イベントリスナーを追加して発火を検証
			await card.evaluate((el) => {
				(el as HTMLElement & { __dblclick_count__: number }).__dblclick_count__ = 0;
				el.addEventListener('dblclick', () => {
					(el as HTMLElement & { __dblclick_count__: number }).__dblclick_count__++;
				});
			});

			await card.dblclick();

			const count = await card.evaluate(
				(el) => (el as HTMLElement & { __dblclick_count__: number }).__dblclick_count__,
			);
			expect(count).toBe(1);
		} finally {
			await deleteItem(page, item.id);
		}
	});

	test('DetailPanel 表示中に Enter キーでトーストが表示されること', async ({ page }) => {
		await resizeWindow(page, 1280, 800);

		const item = await createItem(page, {
			item_type: 'url',
			label: 'Enter起動テスト',
			target: 'https://enter-launch-test.example.com',
		});

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			// カードをクリックして DetailPanel を開く
			await page.getByTestId(`library-card-${item.id}`).click();
			await expect(page.getByTestId('library-detail-panel')).toBeVisible();

			// Enter キーを押す
			await page.keyboard.press('Enter');

			// 「〜 を起動しました」トーストが表示されること
			await expect(page.getByText('Enter起動テスト を起動しました')).toBeVisible({ timeout: 5000 });
		} finally {
			await deleteItem(page, item.id);
		}
	});

	test('タグフィルタ + 検索入力で結果が絞り込まれること', async ({ page }) => {
		await resizeWindow(page, 1280, 800);

		// 異なるタイプのアイテムを作成
		const exeItem = await createItem(page, {
			item_type: 'exe',
			label: 'タグフィルタExe',
			target: 'C:\\test\\filter.exe',
		});
		const urlItem = await createItem(page, {
			item_type: 'url',
			label: 'タグフィルタUrl',
			target: 'https://tag-filter-test.example.com',
		});

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			// サイドバーの exe タグをクリック（title属性で特定）
			const sidebar = page.getByTestId('library-sidebar');
			await expect(sidebar).toBeVisible();

			// exe タグボタンをクリック（SidebarRow は button role）
			const exeTag = sidebar.getByRole('button', { name: /exe/i });
			await exeTag.click();
			await page.waitForTimeout(500);

			// exe アイテムが表示される
			const exeCard = page.getByTestId(`library-card-${exeItem.id}`);
			await expect(exeCard).toBeVisible();

			// url アイテムは非表示（フィルタにより）
			const urlCard = page.getByTestId(`library-card-${urlItem.id}`);
			await expect(urlCard).not.toBeVisible();

			// 検索入力で更に絞り込み
			const searchInput = page.getByPlaceholder('ライブラリを検索');
			await searchInput.fill('タグフィルタ');
			await page.waitForTimeout(300);

			// exe アイテムが引き続き表示される
			await expect(exeCard).toBeVisible();
		} finally {
			await deleteItem(page, exeItem.id);
			await deleteItem(page, urlItem.id);
		}
	});

	test('Enter キーでアイテムが起動しトーストが表示されること', async ({ page }) => {
		await resizeWindow(page, 1280, 800);

		const item = await createItem(page, {
			item_type: 'url',
			label: 'Enter起動テスト',
			target: 'https://enter-launch-test.example.com',
		});

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			// カードをクリックして DetailPanel を開く
			await page.getByTestId(`library-card-${item.id}`).click();
			const detailPanel = page.getByTestId('library-detail-panel');
			await expect(detailPanel.getByText('Enter起動テスト')).toBeVisible();

			// DetailPanel 外（body）にフォーカスを移して Enter を押す
			await page.locator('body').press('Enter');

			// トーストが表示されること
			await expect(page.getByTestId('toast-container')).toBeVisible();
			await expect(page.getByText('Enter起動テスト を起動しました')).toBeVisible();
		} finally {
			await deleteItem(page, item.id);
		}
	});

	test('Toast 閉じるボタンで通知が消えること', async ({ page }) => {
		await resizeWindow(page, 1280, 800);

		const item = await createItem(page, {
			item_type: 'url',
			label: 'Toast閉じるテスト',
			target: 'https://toast-dismiss-test.example.com',
		});

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			// カードをクリックして DetailPanel を開く
			await page.getByTestId(`library-card-${item.id}`).click();
			await expect(page.getByTestId('library-detail-panel')).toBeVisible();

			// Enter キーで起動してトースト表示
			await page.locator('body').press('Enter');
			await expect(page.getByTestId('toast-container')).toBeVisible();

			// Toast の閉じるボタン（aria-label="閉じる"）をクリック
			await page.getByRole('button', { name: '閉じる' }).first().click();

			// Toast が消えること
			await expect(page.getByTestId('toast-container')).not.toBeVisible({ timeout: 3000 });
		} finally {
			await deleteItem(page, item.id);
		}
	});

	test('存在しないパスの exe アイテムをダブルクリックしたときエラートーストが表示されること', async ({
		page,
	}) => {
		await resizeWindow(page, 1280, 800);
		const item = await createItem(page, {
			item_type: 'exe',
			label: '起動失敗テスト',
			target: 'C:\\NONEXISTENT_ARCAGATE_E2E_TEST\\app.exe',
		});
		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);
			await page.getByTestId(`library-card-${item.id}`).dblclick();
			await expect(page.getByTestId('toast-error')).toBeVisible({ timeout: 5000 });
		} finally {
			await deleteItem(page, item.id);
		}
	});

	test('INPUT フォーカス時は Enter キーで起動しないこと', async ({ page }) => {
		await resizeWindow(page, 1280, 800);

		const item = await createItem(page, {
			item_type: 'url',
			label: 'Enterガードテスト',
			target: 'https://enter-guard-test.example.com',
		});

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			// カードをクリックして DetailPanel を開く
			await page.getByTestId(`library-card-${item.id}`).click();
			const detailPanel = page.getByTestId('library-detail-panel');
			await expect(detailPanel.getByText('Enterガードテスト')).toBeVisible();

			// DetailPanel 内の検索または入力にフォーカス
			const searchInput = page.getByPlaceholder('ライブラリを検索');
			await searchInput.focus();

			// フォーカスが INPUT にある状態で Enter を押してもトーストが出ないこと
			await page.keyboard.press('Enter');
			await page.waitForTimeout(300);
			await expect(page.getByTestId('toast-container')).not.toBeVisible();
		} finally {
			await deleteItem(page, item.id);
		}
	});

	test('スターを付けるとボタンの aria-label が切り替わること', async ({ page }) => {
		await resizeWindow(page, 1280, 800);

		const item = await createItem(page, {
			item_type: 'url',
			label: 'スター付けテスト',
			target: 'https://star-add-test.example.com',
		});

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			await page.getByTestId(`library-card-${item.id}`).click();
			const detailPanel = page.getByTestId('library-detail-panel');
			await expect(detailPanel).toBeVisible();

			// 初期状態: スターを付けるボタン
			const starBtn = detailPanel.getByRole('button', { name: 'スターを付ける' });
			await expect(starBtn).toBeVisible();

			await starBtn.click();

			// スターを外すボタンに変わる
			await expect(detailPanel.getByRole('button', { name: 'スターを外す' })).toBeVisible();
		} finally {
			await deleteItem(page, item.id);
		}
	});

	test('スターを外すとボタンの aria-label が戻ること', async ({ page }) => {
		await resizeWindow(page, 1280, 800);

		const item = await createItem(page, {
			item_type: 'url',
			label: 'スター外しテスト',
			target: 'https://star-remove-test.example.com',
		});

		// IPC でスター付け
		await toggleStar(page, item.id, true);

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			await page.getByTestId(`library-card-${item.id}`).click();
			const detailPanel = page.getByTestId('library-detail-panel');

			// 初期状態: スター付き
			const starBtn = detailPanel.getByRole('button', { name: 'スターを外す' });
			await expect(starBtn).toBeVisible();

			await starBtn.click();

			// スターを付けるボタンに戻る
			await expect(detailPanel.getByRole('button', { name: 'スターを付ける' })).toBeVisible();
		} finally {
			await deleteItem(page, item.id);
		}
	});

	test('タグ追加でタグチップが表示されること', async ({ page }) => {
		await resizeWindow(page, 1280, 800);

		const tag = await createTag(page, { name: 'E2Eタグ追加', is_hidden: false });
		const item = await createItem(page, {
			item_type: 'url',
			label: 'タグ追加テスト',
			target: 'https://tag-add-test.example.com',
		});

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			await page.getByTestId(`library-card-${item.id}`).click();
			const detailPanel = page.getByTestId('library-detail-panel');
			await expect(detailPanel).toBeVisible();

			// "+ タグを追加" ボタンをクリック
			await detailPanel.getByRole('button', { name: '+ タグを追加' }).click();

			// ドロップダウン内のタグを選択
			await detailPanel.getByRole('button', { name: 'E2Eタグ追加' }).click();

			// タグチップが表示される
			await expect(detailPanel.getByText('E2Eタグ追加')).toBeVisible();
		} finally {
			await deleteItem(page, item.id);
			await deleteTag(page, tag.id);
		}
	});

	test('タグ削除でタグチップが消えること', async ({ page }) => {
		await resizeWindow(page, 1280, 800);

		const tag = await createTag(page, { name: 'E2Eタグ削除', is_hidden: false });
		const item = await createItem(page, {
			item_type: 'url',
			label: 'タグ削除テスト',
			target: 'https://tag-remove-test.example.com',
			tag_ids: [tag.id],
		});

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			await page.getByTestId(`library-card-${item.id}`).click();
			const detailPanel = page.getByTestId('library-detail-panel');
			await expect(detailPanel).toBeVisible();

			// タグチップが表示されている
			await expect(detailPanel.getByText('E2Eタグ削除')).toBeVisible();

			// 解除ボタンをクリック
			await detailPanel.getByRole('button', { name: 'タグ E2Eタグ削除 を解除' }).click();

			// タグチップが消える
			await expect(detailPanel.getByText('E2Eタグ削除')).not.toBeVisible();
		} finally {
			await deleteItem(page, item.id);
			await deleteTag(page, tag.id);
		}
	});

	test('起動ボタンでトーストが表示されること', async ({ page }) => {
		await resizeWindow(page, 1280, 800);

		const item = await createItem(page, {
			item_type: 'url',
			label: '起動ボタンテスト',
			target: 'https://launch-button-test.example.com',
		});

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			await page.getByTestId(`library-card-${item.id}`).click();
			const detailPanel = page.getByTestId('library-detail-panel');
			await expect(detailPanel).toBeVisible();

			// 起動ボタンをクリック
			await detailPanel.getByRole('button', { name: '起動' }).click();

			// トーストが表示される
			await expect(page.getByText('起動ボタンテスト を起動しました')).toBeVisible({
				timeout: 5000,
			});
		} finally {
			await deleteItem(page, item.id);
		}
	});
});
