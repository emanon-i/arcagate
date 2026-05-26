import { expect, test } from '../fixtures/tauri.js';
import {
	bulkAddTag,
	bulkDeleteItems,
	createItem,
	createWorkspace,
	deleteItem,
	deleteWorkspace,
	getTags,
	listItems,
	listWidgets,
	listWorkspaces,
	searchItems,
	searchItemsInTag,
} from '../helpers/ipc.js';

/**
 * T3 regression (5 件 minimal): 過去 bug regression + state store の race / cache integrity 検証。
 *
 * 引用元: docs/l1_requirements/test-rebuild/index.md (T3 phase、5-12 件 regression)
 *
 * 含めるもの:
 * - workspace switching race (PR-D Codex must-fix #1、T2-3 から移管)
 * - bulk operations (selection mode + bulk add tag / bulk delete)
 * - workspace 削除後の active 切替 (state store の resilience)
 * - starred items via searchItemsInTag (sys-starred tag に bulk add → search)
 * - searchItems case-insensitive (旧 fuzzy-search の lowercase 動作)
 *
 * 各 spec で fixture safe net (markSetupComplete) により SetupWizard 復活問題回避。
 *
 * audit-ui-bypass:ok T3 regression は state store の race / cache integrity を backend IPC
 * + listWorkspaces / listWidgets / searchItems 等で verify する scope。 UI 経路は T2 smoke /
 * 個別機能 spec が担当する分業。
 */
test('T3-1: workspace 別 widgets ownership (PR-D race-fix、T2-3 移管)', async ({ page }) => {
	// 2 つ workspace 作成 (deleteWorkspace は使わない、SetupWizard 復活回避)。
	// 既存 workspaces にも cleanup なしの想定 (一時 ws 残っても他 spec に影響なし、
	// fixture で markSetupComplete safe net あり)。
	const ws1 = await createWorkspace(page, `T3 ws1-${Date.now()}`);
	const ws2 = await createWorkspace(page, `T3 ws2-${Date.now()}`);

	// 各 workspace の widgets は初期状態で空 (ws auto-create では widget seed 無し)
	const ws1_widgets = await listWidgets(page, ws1.id);
	const ws2_widgets = await listWidgets(page, ws2.id);
	expect(ws1_widgets.length).toBe(0);
	expect(ws2_widgets.length).toBe(0);

	// listWorkspaces に両方存在
	const all = await listWorkspaces(page);
	expect(all.find((w) => w.id === ws1.id)).toBeTruthy();
	expect(all.find((w) => w.id === ws2.id)).toBeTruthy();
});

test('T3-2: bulkDeleteItems で複数 item を一括削除 (lessons.md regression)', async ({ page }) => {
	// 3 件 item を作成
	const created = await Promise.all([
		createItem(page, {
			item_type: 'url',
			label: 'T3 bulk 1',
			target: 'https://example.com/t3-bulk-1',
			aliases: [],
			tag_ids: [],
			is_tracked: false,
		}),
		createItem(page, {
			item_type: 'url',
			label: 'T3 bulk 2',
			target: 'https://example.com/t3-bulk-2',
			aliases: [],
			tag_ids: [],
			is_tracked: false,
		}),
		createItem(page, {
			item_type: 'url',
			label: 'T3 bulk 3',
			target: 'https://example.com/t3-bulk-3',
			aliases: [],
			tag_ids: [],
			is_tracked: false,
		}),
	]);

	// bulk delete で 3 件全削除
	const ids = created.map((i) => i.id);
	const count = await bulkDeleteItems(page, ids);
	expect(count).toBe(3);

	// listItems から消えたこと確認
	const remaining = await listItems(page);
	for (const id of ids) {
		expect(remaining.find((i) => i.id === id)).toBeFalsy();
	}
});

test('T3-3: workspace 削除後の listWorkspaces 整合性', async ({ page }) => {
	// createWorkspace × 2 + deleteWorkspace × 1 (両方削除はしない、Home 残す方針で
	// SetupWizard 復活回避)
	const ws1 = await createWorkspace(page, `T3 ws-del-1-${Date.now()}`);
	const ws2 = await createWorkspace(page, `T3 ws-del-2-${Date.now()}`);

	const before = await listWorkspaces(page);
	expect(before.find((w) => w.id === ws1.id)).toBeTruthy();
	expect(before.find((w) => w.id === ws2.id)).toBeTruthy();

	// ws1 削除 (ws2 + 既存 Home が残るので setup-complete state 破壊なし)
	// PH-CF-100: deleteItems=true で現行挙動 (workspace + 紐付き item を消す)
	await deleteWorkspace(page, ws1.id, true);

	const after = await listWorkspaces(page);
	expect(after.find((w) => w.id === ws1.id)).toBeFalsy(); // 消えた
	expect(after.find((w) => w.id === ws2.id)).toBeTruthy(); // 残ってる
	expect(after.length).toBe(before.length - 1);
});

test('T3-4: bulkAddTag + searchItemsInTag で starred items 取得', async ({ page }) => {
	// sys-starred tag を取得
	const tags = await getTags(page);
	const starredTag = tags.find((t) => t.id === 'sys-starred');
	expect(starredTag).toBeTruthy();

	// 2 件 item 作成 + bulkAddTag で sys-starred 付与
	const item1 = await createItem(page, {
		item_type: 'url',
		label: 'T3 star 1',
		target: 'https://example.com/t3-star-1',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});
	const item2 = await createItem(page, {
		item_type: 'url',
		label: 'T3 star 2',
		target: 'https://example.com/t3-star-2',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});

	const count = await bulkAddTag(page, [item1.id, item2.id], 'sys-starred');
	expect(count).toBe(2);

	// searchItemsInTag('sys-starred') で 2 件含まれること
	const starred = await searchItemsInTag(page, 'sys-starred', '');
	expect(starred.find((i) => i.id === item1.id)).toBeTruthy();
	expect(starred.find((i) => i.id === item2.id)).toBeTruthy();

	// cleanup
	await bulkDeleteItems(page, [item1.id, item2.id]);
});

test('T3-5: searchItems が case-insensitive で match', async ({ page }) => {
	const created = await createItem(page, {
		item_type: 'url',
		label: 'CaseSensitiveTest_T3',
		target: 'https://example.com/t3-case',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});

	// 大文字小文字混在 query で match
	const upper = await searchItems(page, 'CASESENSITIVETEST');
	expect(upper.find((i) => i.id === created.id)).toBeTruthy();

	const lower = await searchItems(page, 'casesensitivetest');
	expect(lower.find((i) => i.id === created.id)).toBeTruthy();

	const mixed = await searchItems(page, 'CaSeSeNsItIvE');
	expect(mixed.find((i) => i.id === created.id)).toBeTruthy();

	// cleanup
	await deleteItem(page, created.id);
});
