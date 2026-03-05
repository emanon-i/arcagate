import { invoke } from '@tauri-apps/api/core';
import type { Item, ItemStats } from '$lib/types/item';

export async function searchItems(query: string): Promise<Item[]> {
	return invoke('cmd_search_items', { query });
}

export async function launchItem(itemId: string): Promise<void> {
	return invoke('cmd_launch_item', { itemId });
}

export async function getItemStats(itemId: string): Promise<ItemStats | null> {
	return invoke<ItemStats | null>('cmd_get_item_stats', { itemId });
}
