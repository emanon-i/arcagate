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
				is_tracked: true,
				default_app: null,
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
				is_tracked: false,
				default_app: null,
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
				is_tracked: true,
				default_app: null,
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
			is_tracked: false,
			default_app: null,
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
			tag_ids: [],
			is_tracked: false,
		});

		expect(itemStore.items).toHaveLength(2);
		expect(itemStore.items[1].id).toBe('item-2');
	});

	it('loadLibraryStats() fetches and stores library stats', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		const mockInvoke = vi.mocked(invoke);

		const mockStats = {
			total_items: 42,
			total_tags: 5,
			recent_launch_count: 12,
		};

		mockInvoke.mockResolvedValueOnce(mockStats);

		const { itemStore } = await import('./items.svelte');

		expect(itemStore.libraryStats).toBeNull();

		await itemStore.loadLibraryStats();

		expect(itemStore.libraryStats).toEqual(mockStats);
		expect(mockInvoke).toHaveBeenCalledWith('cmd_get_library_stats');
	});

	it('updateItem() updates the item in the list', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		const mockInvoke = vi.mocked(invoke);

		const original = {
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
			is_tracked: true,
			default_app: null,
			created_at: '2024-01-01T00:00:00Z',
			updated_at: '2024-01-01T00:00:00Z',
		};
		const updated = { ...original, label: 'メモ帳', updated_at: '2024-06-01T00:00:00Z' };

		mockInvoke
			.mockResolvedValueOnce([original]) // loadItems
			.mockResolvedValueOnce(updated); // updateItem

		const { itemStore } = await import('./items.svelte');

		await itemStore.loadItems();
		await itemStore.updateItem('item-1', {
			label: 'メモ帳',
			target: 'notepad.exe',
			args: null,
			working_dir: null,
			icon_path: null,
			aliases: [],
			tag_ids: [],
		});

		const found = itemStore.items.find((i) => i.id === 'item-1');
		expect(found?.label).toBe('メモ帳');
	});

	it('loadTags() fetches and stores tags', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		const mockInvoke = vi.mocked(invoke);

		const mockTags = [
			{ id: 'tag-1', name: 'dev', is_system: false, prefix: 'dev', icon: null },
			{ id: 'tag-2', name: 'game', is_system: false, prefix: 'g', icon: null },
		];
		mockInvoke.mockResolvedValueOnce(mockTags);

		const { itemStore } = await import('./items.svelte');
		await itemStore.loadTags();

		expect(itemStore.tags.some((t) => t.id === 'tag-1')).toBe(true);
		expect(itemStore.tags.some((t) => t.id === 'tag-2')).toBe(true);
	});

	it('loadItems() IPC エラー時に error state が設定される', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke).mockRejectedValueOnce(new Error('DB unavailable'));

		const { itemStore } = await import('./items.svelte');
		await itemStore.loadItems();

		expect(itemStore.error).toContain('DB unavailable');
	});

	it('updateItem() IPC エラー時に error state が設定される', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke).mockRejectedValueOnce(new Error('not found'));

		const { itemStore } = await import('./items.svelte');
		await itemStore.updateItem('nonexistent', {
			label: 'x',
			target: 'x',
			args: null,
			working_dir: null,
			icon_path: null,
			aliases: [],
			tag_ids: [],
		});

		expect(itemStore.error).toContain('not found');
	});

	it('loadTagWithCounts() fetches and stores tags with counts', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		const mockInvoke = vi.mocked(invoke);

		const mockTags = [
			{ id: 'tag-1', name: 'ゲーム', is_system: false, prefix: 'game', icon: null, item_count: 10 },
			{
				id: 'tag-2',
				name: '開発ツール',
				is_system: false,
				prefix: 'dev',
				icon: null,
				item_count: 5,
			},
		];

		mockInvoke.mockResolvedValueOnce(mockTags);

		const { itemStore } = await import('./items.svelte');

		expect(itemStore.tagWithCounts).toEqual([]);

		await itemStore.loadTagWithCounts();

		expect(itemStore.tagWithCounts).toEqual(mockTags);
		expect(mockInvoke).toHaveBeenCalledWith('cmd_get_tag_counts');
	});
});
