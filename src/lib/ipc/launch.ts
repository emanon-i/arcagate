import { invoke } from '@tauri-apps/api/core';
import type { Item } from '$lib/types/item';

export async function searchItems(query: string): Promise<Item[]> {
	return invoke('cmd_search_items', { query });
}

export async function launchItem(itemId: string): Promise<void> {
	return invoke('cmd_launch_item', { itemId });
}
