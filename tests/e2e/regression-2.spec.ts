import { expect, test } from '../fixtures/tauri.js';
import {
	bulkAddTag,
	bulkRemoveTag,
	createItem,
	createTag,
	createWorkspace,
	deleteItem,
	deleteTag,
	getItemTags,
	getTags,
	listWorkspaces,
	searchItemsInTag,
	toggleStar,
	updateWorkspace,
} from '../helpers/ipc.js';

/**
 * T3-2 regression (5 件 minimal): T3-1 で網羅できなかった IPC operation の対称
 * 検証 + lifecycle CRUD。
 *
 * 引用元: docs/l1_requirements/test-rebuild/index.md (T3 phase、5-12 件 regression)
 *
 * T3-1 (5 件) との合算で T3 phase 計 10 件 = target 中央値到達。
 *
 * 含めるもの:
 * - cmd_toggle_star (single-item star、bulkAddTag の対称)
 * - cmd_create_tag + cmd_delete_tag (tag CRUD lifecycle)
 * - cmd_update_workspace (workspace rename)
 * - cmd_bulk_remove_tag (T3-1 bulkAddTag の対称)
 * - cmd_get_item_tags (item に紐づく tag 取得、initial tag_ids 反映)
 *
 * 各 spec で fixture safe net (markSetupComplete) により SetupWizard 復活問題回避。
 *
 * audit-ui-bypass:ok T3 regression は backend IPC operation の対称検証 (toggleStar /
 * createTag / updateWorkspace / bulkRemoveTag / getItemTags) と lifecycle CRUD のみ verify
 * する scope。 UI 経路は T2 smoke / 個別機能 spec が担当する分業。
 */
test('T3-2-1: toggleStar single item で sys-starred 個別 add/remove', async ({ page }) => {
	const created = await createItem(page, {
		item_type: 'url',
		label: 'T3-2 toggle target',
		target: 'https://example.com/t3-2-toggle',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});

	// star on
	await toggleStar(page, created.id, true);
	const starredAfterOn = await searchItemsInTag(page, 'sys-starred', '');
	expect(starredAfterOn.find((i) => i.id === created.id)).toBeTruthy();

	// star off
	await toggleStar(page, created.id, false);
	const starredAfterOff = await searchItemsInTag(page, 'sys-starred', '');
	expect(starredAfterOff.find((i) => i.id === created.id)).toBeFalsy();

	// cleanup
	await deleteItem(page, created.id);
});

test('T3-2-2: createTag + deleteTag で user tag CRUD lifecycle', async ({ page }) => {
	const tagName = `T3-2 user tag ${Date.now()}`;
	const created = await createTag(page, { name: tagName, is_hidden: false });
	expect(created.name).toBe(tagName);
	expect(created.is_system).toBe(false);

	// listTags に登場
	const after = await getTags(page);
	expect(after.find((t) => t.id === created.id)).toBeTruthy();

	// delete
	await deleteTag(page, created.id);

	// listTags から消えた
	const afterDelete = await getTags(page);
	expect(afterDelete.find((t) => t.id === created.id)).toBeFalsy();
});

test('T3-2-3: updateWorkspace で workspace rename → listWorkspaces 反映', async ({ page }) => {
	const initial = `T3-2 ws-rename-${Date.now()}`;
	const renamed = `${initial}-renamed`;
	const ws = await createWorkspace(page, initial);
	expect(ws.name).toBe(initial);

	const updated = await updateWorkspace(page, ws.id, renamed);
	expect(updated.name).toBe(renamed);

	const all = await listWorkspaces(page);
	const found = all.find((w) => w.id === ws.id);
	expect(found?.name).toBe(renamed);
	// 注: deleteWorkspace 1 件以下に抑える方針 (Home + ws 残す → SetupWizard 復活回避)
});

test('T3-2-4: bulkRemoveTag で sys-starred bulk add 後の bulk remove', async ({ page }) => {
	// 2 件 item 作成 + bulkAddTag で sys-starred 付与
	const item1 = await createItem(page, {
		item_type: 'url',
		label: 'T3-2 bulk-remove 1',
		target: 'https://example.com/t3-2-bulkremove-1',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});
	const item2 = await createItem(page, {
		item_type: 'url',
		label: 'T3-2 bulk-remove 2',
		target: 'https://example.com/t3-2-bulkremove-2',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});

	const addCount = await bulkAddTag(page, [item1.id, item2.id], 'sys-starred');
	expect(addCount).toBe(2);

	// remove
	const removeCount = await bulkRemoveTag(page, [item1.id, item2.id], 'sys-starred');
	expect(removeCount).toBe(2);

	// searchItemsInTag('sys-starred') から両方消えた
	const starred = await searchItemsInTag(page, 'sys-starred', '');
	expect(starred.find((i) => i.id === item1.id)).toBeFalsy();
	expect(starred.find((i) => i.id === item2.id)).toBeFalsy();

	// cleanup
	await deleteItem(page, item1.id);
	await deleteItem(page, item2.id);
});

test('T3-2-5: getItemTags で createItem の initial tag_ids が反映', async ({ page }) => {
	// user tag 作成 (system tag は initial tag_ids には付けないので user tag 経由で検証)
	const tagName = `T3-2 init-tag ${Date.now()}`;
	const tag = await createTag(page, { name: tagName, is_hidden: false });

	// item を tag_ids: [tag.id] で作成
	const item = await createItem(page, {
		item_type: 'url',
		label: 'T3-2 init-tag target',
		target: 'https://example.com/t3-2-inittag',
		aliases: [],
		tag_ids: [tag.id],
		is_tracked: false,
	});

	// getItemTags で tag が返る
	const itemTags = await getItemTags(page, item.id);
	expect(itemTags.find((t) => t.id === tag.id)).toBeTruthy();

	// cleanup
	await deleteItem(page, item.id);
	await deleteTag(page, tag.id);
});
