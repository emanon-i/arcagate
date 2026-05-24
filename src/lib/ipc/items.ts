import { invoke } from '@tauri-apps/api/core';
import type { CreateItemInput, Item, LibraryStats, UpdateItemInput } from '$lib/types/item';
import type { ItemMetadata } from '$lib/types/item-metadata';
import type { CreateTagInput, Tag, TagWithCount } from '$lib/types/tag';
import { wrapIpc } from '$lib/utils/perf';

export async function createItem(input: CreateItemInput): Promise<Item> {
	return invoke<Item>('cmd_create_item', { input });
}

export async function listItems(): Promise<Item[]> {
	return wrapIpc('list_items', () => invoke<Item[]>('cmd_list_items'));
}

export async function updateItem(id: string, input: UpdateItemInput): Promise<Item> {
	return invoke<Item>('cmd_update_item', { id, input });
}

export async function deleteItem(id: string): Promise<void> {
	return invoke<void>('cmd_delete_item', { id });
}

/**
 * アイテムライフサイクル契約 U-5: 「Library に残しつつ当該 workspace から外す」 操作。
 * 削除 (`deleteItem`) と意図的に区別する。 backend が sys-ws-* tag 解除 +
 * 当該 workspace の widget config から item 参照を strip する (item 行は残る)。
 */
export async function removeItemFromWorkspace(workspaceId: string, itemId: string): Promise<void> {
	return invoke<void>('cmd_remove_item_from_workspace', { workspaceId, itemId });
}

// PH-issue-006: 削除確認 dialog 用 — 該当 item を参照する widget 数。
export async function countItemReferences(id: string): Promise<number> {
	return invoke<number>('cmd_count_item_references', { id });
}

export async function getTags(): Promise<Tag[]> {
	return invoke<Tag[]>('cmd_get_tags');
}

export async function createTag(input: CreateTagInput): Promise<Tag> {
	return invoke<Tag>('cmd_create_tag', { input });
}

export async function updateTagPrefix(id: string, prefix: string | null): Promise<void> {
	return invoke<void>('cmd_update_tag_prefix', { id, prefix });
}

/**
 * PH-CF-600 C4: `includeDisabled` で hidden item を結果に含めるかを明示する。
 *
 * call-site matrix:
 * - Library 画面 (`itemStore.loadItemsByTag` 経由) → `libraryShowHidden` ON 時のみ `true`
 * - palette / favorites widget / workspace picker / starred badge → 省略 (= 従来挙動、 hidden 除外)
 *
 * 共有クエリの挙動を変えるときは `docs/l2_foundation/features/screens/library.md` の
 * hidden 表示契約 + call-site matrix を必ず照合する。
 */
export async function searchItemsInTag(
	tagId: string,
	query: string,
	includeDisabled = false,
): Promise<Item[]> {
	return wrapIpc('search_items_in_tag', () =>
		invoke<Item[]>('cmd_search_items_in_tag', { tagId, query, includeDisabled }),
	);
}

export async function checkIsDirectory(path: string): Promise<boolean> {
	return invoke<boolean>('cmd_check_is_directory', { path });
}

/**
 * 複数 item_id の metadata を一括取得 (LibraryCard 一覧表示で per-card IPC 並列を回避)。
 * - DB lookup は単一 lock + 複数 find_by_id、id が無い分は結果に含まれない (fail-soft)
 * - filesystem stat 失敗は空 ItemMetadata で埋まる
 */
export async function getItemsMetadataBatch(ids: string[]): Promise<Array<[string, ItemMetadata]>> {
	if (ids.length === 0) return [];
	return wrapIpc('get_items_metadata_batch', () =>
		invoke<Array<[string, ItemMetadata]>>('cmd_get_items_metadata_batch', { ids }),
	);
}

export async function extractItemIcon(exePath: string): Promise<string> {
	return invoke<string>('cmd_extract_item_icon', { exePath });
}

export async function countHiddenItems(): Promise<number> {
	return invoke<number>('cmd_count_hidden_items');
}

export async function getItemTags(itemId: string): Promise<Tag[]> {
	return invoke<Tag[]>('cmd_get_item_tags', { itemId });
}

export async function getLibraryStats(): Promise<LibraryStats> {
	return invoke<LibraryStats>('cmd_get_library_stats');
}

export async function getTagWithCounts(): Promise<TagWithCount[]> {
	return invoke<TagWithCount[]>('cmd_get_tag_counts');
}

// U-7 (2026-05-12): widget 経由登録時 workspace_id を渡せば sys-ws-<id> tag が自動付与される。
// PH-CF-100: sourceWidgetId Some なら監視自動登録経路 (back-link 列を埋める + widget_item_hides
// と連動 = user 削除した entry を次の scan で復活させない)。 None は user 直接経路 (従来挙動)。
export async function autoRegisterFolderItems(
	rootPath: string,
	workspaceId?: string,
	sourceWidgetId?: string,
): Promise<Item[]> {
	return invoke<Item[]>('cmd_auto_register_folder_items', {
		rootPath,
		workspaceId,
		sourceWidgetId,
	});
}

// PH-CF-100 / PH-CF-400: sourceWidgetId Some なら exe-folder 監視 widget 由来。
// entryKeys は scan の `folder_path` (= 第1階層フォルダ正規化済 絶対パス) を paths と同順で
// 渡す。 None / 長さ不一致なら backend が exe path の parent folder で fallback する。
// widget_item_hides に登録された entry は skip (= 復活しない)。
export async function registerExeItemsBulk(
	paths: string[],
	entryKeys?: string[],
	workspaceId?: string,
	sourceWidgetId?: string,
): Promise<Item[]> {
	return invoke<Item[]>('cmd_register_exe_items_bulk', {
		paths,
		entryKeys,
		workspaceId,
		sourceWidgetId,
	});
}

export async function toggleStar(itemId: string, starred: boolean): Promise<Item> {
	return invoke<Item>('cmd_toggle_star', { itemId, starred });
}

// PH-436: 一括タグ操作 (transaction、最大 1000 件)
export async function bulkAddTag(itemIds: string[], tagId: string): Promise<number> {
	return invoke<number>('cmd_bulk_add_tag', { itemIds, tagId });
}

export async function bulkRemoveTag(itemIds: string[], tagId: string): Promise<number> {
	return invoke<number>('cmd_bulk_remove_tag', { itemIds, tagId });
}

export async function bulkDeleteItems(itemIds: string[]): Promise<number> {
	return invoke<number>('cmd_bulk_delete_items', { itemIds });
}
