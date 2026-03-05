import { invoke } from '@tauri-apps/api/core';
import type { Category, CategoryWithCount, CreateCategoryInput } from '$lib/types/category';
import type { CreateItemInput, Item, LibraryStats, UpdateItemInput } from '$lib/types/item';
import type { CreateTagInput, Tag } from '$lib/types/tag';

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

export async function getCategories(): Promise<Category[]> {
	return invoke<Category[]>('cmd_get_categories');
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
	return invoke<Category>('cmd_create_category', { input });
}

export async function updateCategory(
	id: string,
	name: string,
	prefix: string | null,
): Promise<void> {
	return invoke<void>('cmd_update_category', { id, name, prefix });
}

export async function deleteCategory(id: string): Promise<void> {
	return invoke<void>('cmd_delete_category', { id });
}

export async function searchItemsInCategory(categoryId: string, query: string): Promise<Item[]> {
	return invoke<Item[]>('cmd_search_items_in_category', { categoryId, query });
}

export async function getTags(): Promise<Tag[]> {
	return invoke<Tag[]>('cmd_get_tags');
}

export async function createTag(input: CreateTagInput): Promise<Tag> {
	return invoke<Tag>('cmd_create_tag', { input });
}

export async function extractItemIcon(exePath: string): Promise<string | null> {
	return invoke<string | null>('cmd_extract_item_icon', { exePath });
}

export async function countHiddenItems(): Promise<number> {
	return invoke<number>('cmd_count_hidden_items');
}

export async function getItemCategories(itemId: string): Promise<Category[]> {
	return invoke<Category[]>('cmd_get_item_categories', { itemId });
}

export async function getLibraryStats(): Promise<LibraryStats> {
	return invoke<LibraryStats>('cmd_get_library_stats');
}

export async function getCategoryWithCounts(): Promise<CategoryWithCount[]> {
	return invoke<CategoryWithCount[]>('cmd_get_category_counts');
}
