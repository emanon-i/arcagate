import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

const mockItem = {
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
};

const mockItem2 = {
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

describe('paletteStore', () => {
	beforeEach(async () => {
		vi.resetAllMocks();
	});

	it('search() calls IPC and updates results', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		const mockInvoke = vi.mocked(invoke);
		mockInvoke.mockResolvedValueOnce([mockItem, mockItem2]);

		const { paletteStore } = await import('./palette.svelte');

		await paletteStore.search('note');

		expect(mockInvoke).toHaveBeenCalledWith('cmd_search_items', { query: 'note' });
		expect(paletteStore.results).toHaveLength(2);
		expect(paletteStore.query).toBe('note');
	});

	it('search() resets selectedIndex to 0', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		const mockInvoke = vi.mocked(invoke);
		mockInvoke.mockResolvedValueOnce([mockItem, mockItem2]);

		const { paletteStore } = await import('./palette.svelte');

		await paletteStore.search('note');
		paletteStore.selectNext();
		expect(paletteStore.selectedIndex).toBe(1);

		mockInvoke.mockResolvedValueOnce([mockItem]);
		await paletteStore.search('new');
		expect(paletteStore.selectedIndex).toBe(0);
	});

	it('selectNext() increments selectedIndex', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		const mockInvoke = vi.mocked(invoke);
		mockInvoke.mockResolvedValueOnce([mockItem, mockItem2]);

		const { paletteStore } = await import('./palette.svelte');

		await paletteStore.search('note');
		expect(paletteStore.selectedIndex).toBe(0);

		paletteStore.selectNext();
		expect(paletteStore.selectedIndex).toBe(1);
	});

	it('selectNext() clamps at results.length - 1', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		const mockInvoke = vi.mocked(invoke);
		mockInvoke.mockResolvedValueOnce([mockItem, mockItem2]);

		const { paletteStore } = await import('./palette.svelte');

		await paletteStore.search('note');
		paletteStore.selectNext(); // index = 1
		paletteStore.selectNext(); // clamp at 1 (length - 1 = 1)
		expect(paletteStore.selectedIndex).toBe(1);
	});

	it('selectPrev() decrements selectedIndex', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		const mockInvoke = vi.mocked(invoke);
		mockInvoke.mockResolvedValueOnce([mockItem, mockItem2]);

		const { paletteStore } = await import('./palette.svelte');

		await paletteStore.search('note');
		paletteStore.selectNext(); // index = 1
		paletteStore.selectPrev(); // index = 0
		expect(paletteStore.selectedIndex).toBe(0);
	});

	it('selectPrev() clamps at 0', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		const mockInvoke = vi.mocked(invoke);
		mockInvoke.mockResolvedValueOnce([mockItem]);

		const { paletteStore } = await import('./palette.svelte');

		await paletteStore.search('note');
		paletteStore.selectPrev(); // already 0
		expect(paletteStore.selectedIndex).toBe(0);
	});

	it('launch() calls launchItem IPC and closes the palette', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		const mockInvoke = vi.mocked(invoke);
		mockInvoke.mockResolvedValueOnce([mockItem]);
		mockInvoke.mockResolvedValueOnce(undefined); // launchItem

		const { paletteStore } = await import('./palette.svelte');

		paletteStore.open();
		expect(paletteStore.isOpen).toBe(true);

		await paletteStore.search('note');
		await paletteStore.launch(mockItem);

		expect(mockInvoke).toHaveBeenCalledWith('cmd_launch_item', { itemId: 'item-1' });
		expect(paletteStore.isOpen).toBe(false);
	});
});
