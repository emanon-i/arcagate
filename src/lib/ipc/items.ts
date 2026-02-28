import { invoke } from '@tauri-apps/api/core';
import type { Category, CreateCategoryInput } from '$lib/types/category';
import type { CreateItemInput, Item, UpdateItemInput } from '$lib/types/item';
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

export async function getTags(): Promise<Tag[]> {
	return invoke<Tag[]>('cmd_get_tags');
}

export async function createTag(input: CreateTagInput): Promise<Tag> {
	return invoke<Tag>('cmd_create_tag', { input });
}

export async function extractItemIcon(exePath: string): Promise<string | null> {
	return invoke<string | null>('cmd_extract_item_icon', { exePath });
}
