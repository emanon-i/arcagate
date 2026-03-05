import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

describe('itemStore', () => {
	beforeEach(async () => {
		vi.resetAllMocks();
	});

	it('deleteItem() removes the item from the list', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		const mockInvoke = vi.mocked(invoke);

		const mockItems = [
			{
				id: 'item-1',
				item_type: 'exe' as const,
				label: 'Notepad',
				target: 'notepad.exe',
				args: null,
				working_dir: null,
				icon_path: null,
				icon_type: null,
				aliases: [],
				sort_order: 0,
				is_enabled: true,
				created_at: '2024-01-01T00:00:00Z',
				updated_at: '2024-01-01T00:00:00Z',
			},
			{
				id: 'item-2',
				item_type: 'url' as const,
				label: 'GitHub',
				target: 'https://github.com',
				args: null,
				working_dir: null,
				icon_path: null,
				icon_type: null,
				aliases: [],
				sort_order: 1,
				is_enabled: true,
				created_at: '2024-01-01T00:00:00Z',
				updated_at: '2024-01-01T00:00:00Z',
			},
		];

		// First call: listItems returns mockItems
		mockInvoke.mockResolvedValueOnce(mockItems);
		// Second call: deleteItem returns void
		mockInvoke.mockResolvedValueOnce(undefined);

		const { itemStore } = await import('./items.svelte');

		await itemStore.loadItems();
		expect(itemStore.items).toHaveLength(2);

		await itemStore.deleteItem('item-1');
		expect(itemStore.items).toHaveLength(1);
		expect(itemStore.items[0].id).toBe('item-2');
	});

	it('createItem() adds item to the list after reload', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		const mockInvoke = vi.mocked(invoke);

		const existingItems = [
			{
				id: 'item-1',
				item_type: 'exe' as const,
				label: 'Notepad',
				target: 'notepad.exe',
				args: null,
				working_dir: null,
				icon_path: null,
				icon_type: null,
				aliases: [],
				sort_order: 0,
				is_enabled: true,
				created_at: '2024-01-01T00:00:00Z',
				updated_at: '2024-01-01T00:00:00Z',
			},
		];

		const newItem = {
			id: 'item-2',
			item_type: 'url' as const,
			label: 'GitHub',
			target: 'https://github.com',
			args: null,
			working_dir: null,
			icon_path: null,
			icon_type: null,
			aliases: [],
			sort_order: 1,
			is_enabled: true,
			created_at: '2024-01-01T00:00:00Z',
			updated_at: '2024-01-01T00:00:00Z',
		};

		// loadItems initial
		mockInvoke.mockResolvedValueOnce(existingItems);
		// createItem
		mockInvoke.mockResolvedValueOnce(newItem);
		// loadItems after create
		mockInvoke.mockResolvedValueOnce([...existingItems, newItem]);

		const { itemStore } = await import('./items.svelte');

		await itemStore.loadItems();
		expect(itemStore.items).toHaveLength(1);

		await itemStore.createItem({
			item_type: 'url',
			label: 'GitHub',
			target: 'https://github.com',
			args: null,
			working_dir: null,
			icon_path: null,
			aliases: [],
			category_ids: [],
			tag_ids: [],
		});

		expect(itemStore.items).toHaveLength(2);
		expect(itemStore.items[1].id).toBe('item-2');
	});

	it('loadLibraryStats() fetches and stores library stats', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		const mockInvoke = vi.mocked(invoke);

		const mockStats = {
			total_items: 42,
			total_categories: 5,
			recent_launch_count: 12,
		};

		mockInvoke.mockResolvedValueOnce(mockStats);

		const { itemStore } = await import('./items.svelte');

		expect(itemStore.libraryStats).toBeNull();

		await itemStore.loadLibraryStats();

		expect(itemStore.libraryStats).toEqual(mockStats);
		expect(mockInvoke).toHaveBeenCalledWith('cmd_get_library_stats');
	});

	it('loadCategoryWithCounts() fetches and stores categories with counts', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		const mockInvoke = vi.mocked(invoke);

		const mockCategories = [
			{ id: 'cat-1', name: 'ゲーム', prefix: 'game', item_count: 10 },
			{ id: 'cat-2', name: '開発ツール', prefix: 'dev', item_count: 5 },
		];

		mockInvoke.mockResolvedValueOnce(mockCategories);

		const { itemStore } = await import('./items.svelte');

		expect(itemStore.categoryWithCounts).toEqual([]);

		await itemStore.loadCategoryWithCounts();

		expect(itemStore.categoryWithCounts).toEqual(mockCategories);
		expect(mockInvoke).toHaveBeenCalledWith('cmd_get_category_counts');
	});
});
