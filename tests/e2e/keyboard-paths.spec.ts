import { expect, test } from '../fixtures/tauri.js';
import {
	createItem,
	deleteItem,
	markOnboardingComplete,
	markSetupComplete,
	resetFirstRun,
} from '../helpers/ipc.js';

/**
 * PH-PQ-300 T6: 完全キーボード経路の機械検証 (WCAG 2.1.1 Keyboard)。
 *
 * 主要 flow を「キーボード操作のみ」で完走できることを e2e で保証する。 マウス click は
 * 使わず focus() + keyboard.press()/type() のみで駆動し、 期待される結果状態を assert する。
 *
 * 注: グローバル hotkey (Ctrl+Shift+Space で Palette 起動) は e2e で ARCAGATE_SKIP_HOTKEY=1 の
 * ため検査対象外 (OS hotkey 競合回避)。 Palette 内部の矢印 nav は a11y/SR checklist で別途記録。
 *
 * 引用元: docs/l3_phases/paid-quality/PH-PQ-300_craft-sweep.md T6
 *         docs/l3_phases/paid-quality/audit/keyboard-path-checklist.md
 */

test.describe('完全キーボード経路 — WCAG 2.1.1', () => {
	test.afterEach(async ({ page }) => {
		await page.keyboard.press('Escape').catch(() => {});
		await page.keyboard.press('Escape').catch(() => {});
		await markSetupComplete(page).catch(() => {});
		await markOnboardingComplete(page).catch(() => {});
		// activeView は persist されるため、 Workspace に居たまま終わると後続 spec の
		// 「Library default view」 前提が壊れる。 Library tab に戻して view を復帰させる。
		const libraryTab = page.getByRole('button', { name: 'Library', exact: true });
		if (await libraryTab.isVisible().catch(() => false)) {
			await libraryTab.click().catch(() => {});
		}
	});

	test('F1. Library 検索: focus → type → 絞り込み', async ({ page }) => {
		const created: string[] = [];
		for (const name of ['keyboard alpha', 'keyboard beta', 'mouse gamma']) {
			const item = await createItem(page, {
				item_type: 'url',
				label: name,
				target: 'https://example.com',
				aliases: [],
				tag_ids: [],
			});
			created.push(item.id);
		}
		try {
			await page.reload();
			await page.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 });
			const search = page.getByPlaceholder('ライブラリを検索');
			await search.focus();
			await expect(search).toBeFocused();
			await page.keyboard.type('keyboard');
			await expect(page.getByText('keyboard alpha')).toBeVisible({ timeout: 10_000 });
			await expect(page.getByText('mouse gamma')).toHaveCount(0);
			// Esc で検索クリア (keyboard で復帰可能)
			await page.keyboard.press('Escape');
		} finally {
			for (const id of created) await deleteItem(page, id).catch(() => {});
		}
	});

	test('F2. トップナビ: Tab で到達 → キーボードで Workspace 切替', async ({ page }) => {
		const workspaceTab = page.getByRole('button', { name: 'Workspace', exact: true });
		await workspaceTab.focus();
		await expect(workspaceTab).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(page.getByTestId('canvas-toolbar')).toBeVisible({ timeout: 15_000 });
		// Library へ戻る (キーボード)
		const libraryTab = page.getByRole('button', { name: 'Library', exact: true });
		await libraryTab.focus();
		await page.keyboard.press('Enter');
		await expect(page.getByRole('region', { name: 'ライブラリ' })).toBeVisible({
			timeout: 15_000,
		});
	});

	test('F3. Settings: キーボードで開く → 矢印でカテゴリ移動 → Esc で閉じる', async ({ page }) => {
		const settingsBtn = page.getByRole('button', { name: 'Settings', exact: true });
		await settingsBtn.focus();
		await page.keyboard.press('Enter');
		const tablist = page.getByRole('tablist', { name: '設定カテゴリ' });
		await expect(tablist).toBeVisible({ timeout: 15_000 });

		// 初期 active tab (general) に focus し、 ArrowDown で次カテゴリへ
		const generalTab = page.getByRole('tab', { name: /general/i });
		await generalTab.focus();
		await page.keyboard.press('ArrowDown');
		await expect(page.getByRole('tab', { name: /library/i })).toHaveAttribute(
			'aria-selected',
			'true',
		);
		await page.keyboard.press('ArrowUp');
		await expect(generalTab).toHaveAttribute('aria-selected', 'true');

		// Esc で modal を閉じる
		await page.keyboard.press('Escape');
		await expect(tablist).toBeHidden({ timeout: 10_000 });
	});

	test('F4. Workspace canvas: zoom reset hotkey が keyboard で効く', async ({ page }) => {
		await page.getByRole('button', { name: 'Workspace', exact: true }).focus();
		await page.keyboard.press('Enter');
		const toolbar = page.getByTestId('canvas-toolbar');
		await expect(toolbar).toBeVisible({ timeout: 15_000 });
		// Ctrl+0 (zoom 100% reset) / Ctrl+Z (undo) を押しても crash せず toolbar が残る
		await page.keyboard.press('Control+0');
		await page.keyboard.press('Control+z');
		await expect(toolbar).toBeVisible();
	});

	test('F5. SetupWizard: Tab + Enter のみで完走', async ({ page }) => {
		await resetFirstRun(page);
		await page.reload();
		await page.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 });
		const wizard = page.getByTestId('setup-wizard');
		await expect(wizard).toBeVisible({ timeout: 15_000 });

		// 各 step の主 action button を focus → Enter で進める (マウス不使用)
		const welcomeNext = page.getByTestId('setup-welcome-next');
		await welcomeNext.focus();
		await expect(welcomeNext).toBeFocused();
		await page.keyboard.press('Enter');

		const hotkeyNext = page.getByTestId('setup-hotkey-next');
		await hotkeyNext.focus();
		await page.keyboard.press('Enter');

		const finish = page.getByTestId('setup-finish');
		await finish.focus();
		await page.keyboard.press('Enter');

		await expect(wizard).toBeHidden({ timeout: 10_000 });

		// resetFirstRun を巻き戻したまま放置すると OnboardingTour overlay が後続 spec を
		// 阻害するため、 setup/onboarding を complete に戻し reload で clean state を渡す。
		await markSetupComplete(page);
		await markOnboardingComplete(page);
		await page.reload();
		await page.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 });
	});

	test('F6. キーボードトラップ無し: Tab を連打しても focus が進む', async ({ page }) => {
		// 前 test (SetupWizard reset 等) の影響を受けないよう default view を reload で復帰し、
		// 残った overlay を Esc で閉じ、 確実に Library view へ移動してから検査する。
		await page.reload();
		await page.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 });
		await page.keyboard.press('Escape').catch(() => {});
		const libraryTab = page.getByRole('button', { name: 'Library', exact: true });
		if (await libraryTab.isVisible().catch(() => false)) {
			await libraryTab.click();
		}
		await expect(page.getByRole('region', { name: 'ライブラリ' })).toBeVisible({
			timeout: 15_000,
		});
		// body から Tab を 12 回。 同一要素に張り付く (= trap) ことが無いことを確認。
		await page
			.locator('body')
			.click({ position: { x: 2, y: 2 } })
			.catch(() => {});
		const seen = new Set<string>();
		let stuckCount = 0;
		let prev = '';
		for (let i = 0; i < 12; i++) {
			await page.keyboard.press('Tab');
			// 位置 + role + label を含む signature。 同一 class の要素 (card 等) も座標で区別する。
			const sig = await page.evaluate(() => {
				const el = document.activeElement as HTMLElement | null;
				if (!el || el === document.body) return 'body';
				const r = el.getBoundingClientRect();
				const label = el.getAttribute('aria-label') ?? el.textContent?.slice(0, 16) ?? '';
				return `${el.tagName}#${el.id}[${label}]@${Math.round(r.top)},${Math.round(r.left)}`;
			});
			if (sig === prev) stuckCount++;
			prev = sig;
			seen.add(sig);
		}
		// 12 回 Tab して 3 種以上の focus 先 = trap 無し。 連続して同一要素に
		// 張り付く (= trap) ことが無いことも確認。
		expect(seen.size).toBeGreaterThanOrEqual(3);
		expect(stuckCount).toBeLessThan(3);
	});
});
