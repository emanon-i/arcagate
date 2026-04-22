import { invoke } from '@tauri-apps/api/core';
import type { CreateItemInput, Item, LibraryStats, UpdateItemInput } from '$lib/types/item';
import type { CreateTagInput, Tag, TagWithCount } from '$lib/types/tag';

export async function createItem(input: CreateItemInput): Promise<Item> {
	return invoke<Item>('cmd_create_item', { input });
}

export async function listItems(): Promise<Item[]> {
	return invoke<Item[]>('cmd_list_items');
}

export async function updateItem(id: string, input: UpdateItemInput): Promise<Item> {
	return invoke<Item>('cmd_update_item', { id, input });
}

export async function deleteItem(id: string): Promise<void> {
	return invoke<void>('cmd_delete_item', { id });
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

export async function searchItemsInTag(tagId: string, query: string): Promise<Item[]> {
	return invoke<Item[]>('cmd_search_items_in_tag', { tagId, query });
}

export async function checkIsDirectory(path: string): Promise<boolean> {
	return invoke<boolean>('cmd_check_is_directory', { path });
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

export async function autoRegisterFolderItems(rootPath: string): Promise<Item[]> {
	return invoke<Item[]>('cmd_auto_register_folder_items', { rootPath });
}
