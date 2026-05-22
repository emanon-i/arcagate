import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/tauri.js';
import {
	addWidget,
	createItem,
	deleteItem,
	deleteWidget,
	updateWidgetConfig,
	waitForHomeWorkspace,
} from '../helpers/ipc.js';

/**
 * PH-PQ-600 B: Routine widget の e2e。
 *
 * 受け入れ条件 (PH-PQ-600 §受け入れ条件):
 * - Routine widget が実装、複数 item を束ねた 1 クリック一斉起動が動作
 * - stale (削除済) item id が skip され、UI に明示される
 * - e2e spec pass + axe pass (PQ-300 基準)
 *
 * 注意: 実 launch (cmd_launch_item) は外部 process / browser を開くため e2e では click しない
 * (critical-path.spec と同方針「実 launch しない」)。一斉起動の挙動は launch button が
 * enabled で操作可能であること + stale 行が明示されることで担保する。
 */

/** workspace view を開く。activeView=workspace で reload → workspace-config store が
 *  loadWorkspaces() を走らせ、未作成なら Home workspace を auto-create する。 */
async function openWorkspace(page: Page): Promise<void> {
	await page.evaluate(() => localStorage.setItem('arcagate.app.activeView', 'workspace'));
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });
}

// 各 test は openWorkspace で activeView を 'workspace' に切り替える。これは localStorage に
// 永続するため、後続 spec (smoke.spec の「library view default で表示」 等) が Library
// default view を前提に壊れる。a11y.spec と同様、afterEach で Library view へ戻す。
test.afterEach(async ({ page }) => {
	await page.keyboard.press('Escape').catch(() => {});
	await page.keyboard.press('Escape').catch(() => {});
	const libraryTab = page.getByRole('button', { name: 'Library', exact: true });
	if (await libraryTab.isVisible().catch(() => false)) {
		await libraryTab.click().catch(() => {});
	}
});

test('Routine widget: proof-of-life — 空状態で empty state が描画される', async ({ page }) => {
	await openWorkspace(page);
	const ws = await waitForHomeWorkspace(page);
	const widget = await addWidget(page, ws.id, 'routine');
	try {
		await openWorkspace(page);
		await page.getByTestId(`workspace-tab-${ws.id}`).click();
		await expect(page.locator('[data-widget-id]').first()).toBeVisible({ timeout: 15_000 });
		// 空状態は共通 EmptyState (testId=routine-empty)。
		await expect(page.getByTestId('routine-empty')).toBeVisible({ timeout: 15_000 });
	} finally {
		await deleteWidget(page, widget.id).catch(() => {});
	}
});

test('Routine widget: 複数 item を束ねた一斉起動 UI + stale item の skip/明示', async ({
	page,
}) => {
	await openWorkspace(page);
	const ws = await waitForHomeWorkspace(page);
	const itemA = await createItem(page, {
		item_type: 'url',
		label: 'routine probe A',
		target: 'https://example.com/routine-a',
		aliases: [],
		tag_ids: [],
	});
	const itemB = await createItem(page, {
		item_type: 'url',
		label: 'routine probe B',
		target: 'https://example.com/routine-b',
		aliases: [],
		tag_ids: [],
	});
	const widget = await addWidget(page, ws.id, 'routine');
	// 2 件の valid item + 1 件の stale (存在しない id) を束ねる。
	await updateWidgetConfig(
		page,
		widget.id,
		JSON.stringify({
			items: [itemA.id, 'stale-id-does-not-exist', itemB.id],
			label: 'e2e routine',
		}),
	);
	try {
		await openWorkspace(page);
		await page.getByTestId(`workspace-tab-${ws.id}`).click();
		await expect(page.locator('[data-widget-id]').first()).toBeVisible({ timeout: 15_000 });

		// 一斉起動 button が描画され、操作可能 (valid item が 1 件以上あるため enabled)。
		const launchBtn = page.getByTestId('routine-launch-all');
		await expect(launchBtn).toBeVisible({ timeout: 15_000 });
		await expect(launchBtn).toBeEnabled();

		// valid item が一覧に出る。
		await expect(page.getByText('routine probe A')).toBeVisible();
		await expect(page.getByText('routine probe B')).toBeVisible();

		// stale (削除済) item id は起動から skip され、UI に「削除済み」 badge で明示される。
		await expect(page.getByText('削除済み').first()).toBeVisible();
	} finally {
		await deleteWidget(page, widget.id).catch(() => {});
		await deleteItem(page, itemA.id).catch(() => {});
		await deleteItem(page, itemB.id).catch(() => {});
	}
});

test('Routine widget: axe — WCAG 2.2 AA 違反 0 (PQ-300 基準)', async ({ page }, testInfo) => {
	await openWorkspace(page);
	const ws = await waitForHomeWorkspace(page);
	const item = await createItem(page, {
		item_type: 'url',
		label: 'routine axe probe',
		target: 'https://example.com/routine-axe',
		aliases: [],
		tag_ids: [],
	});
	const widget = await addWidget(page, ws.id, 'routine');
	await updateWidgetConfig(
		page,
		widget.id,
		JSON.stringify({ items: [item.id], label: 'axe routine' }),
	);
	try {
		await openWorkspace(page);
		await page.getByTestId(`workspace-tab-${ws.id}`).click();
		await expect(page.locator('[data-widget-id]').first()).toBeVisible({ timeout: 15_000 });

		// 検査対象は routine widget の subtree に限定 (PH-PQ-600 受け入れ条件は
		// 「Routine widget が axe pass」。 PageTabBar 等の既存 a11y は a11y.spec が全画面で gate)。
		// a11y.spec と同方針: 構造的 a11y を gate、color-contrast は token 起因のため除外。
		const results = await new AxeBuilder({ page })
			.include(`[data-widget-id="${widget.id}"]`)
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
			.disableRules(['color-contrast'])
			.analyze();
		if (results.violations.length > 0) {
			await testInfo.attach('axe-violations-routine', {
				body: JSON.stringify(results.violations, null, 2),
				contentType: 'application/json',
			});
		}
		expect(results.violations).toEqual([]);
	} finally {
		await deleteWidget(page, widget.id).catch(() => {});
		await deleteItem(page, item.id).catch(() => {});
	}
});
