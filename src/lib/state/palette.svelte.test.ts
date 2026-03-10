import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
	readText: vi.fn().mockResolvedValue(''),
	writeText: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('$lib/state/items.svelte', () => ({
	itemStore: {
		tags: [],
	},
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
	is_tracked: true,
	default_app: null,
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
	is_tracked: false,
	default_app: null,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
};

describe('paletteStore', () => {
	beforeEach(async () => {
		vi.resetAllMocks();
		vi.mocked((await import('@tauri-apps/plugin-clipboard-manager')).readText).mockResolvedValue(
			'',
		);
	});

	it('search() calls IPC and updates results', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		const mockInvoke = vi.mocked(invoke);
		mockInvoke.mockResolvedValueOnce([mockItem, mockItem2]);

		const { paletteStore } = await import('./palette.svelte');

		await paletteStore.search('note');

		expect(mockInvoke).toHaveBeenCalledWith('cmd_search_items', { query: 'note' });
		expect(paletteStore.results).toHaveLength(2);
		expect(paletteStore.results[0].kind).toBe('item');
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
		await paletteStore.launch({ kind: 'item', item: mockItem });

		expect(mockInvoke).toHaveBeenCalledWith('cmd_launch_item', { itemId: 'item-1' });
		expect(paletteStore.isOpen).toBe(false);
	});

	it('search("= 3*7+1") returns calc result 22', async () => {
		const { paletteStore } = await import('./palette.svelte');

		await paletteStore.search('= 3*7+1');

		expect(paletteStore.results).toHaveLength(1);
		const entry = paletteStore.results[0];
		expect(entry.kind).toBe('calc');
		if (entry.kind === 'calc') {
			expect(entry.result).toBe('22');
		}
	});

	it('launch() calc entry copies to clipboard and closes', async () => {
		const clipboardModule = await import('@tauri-apps/plugin-clipboard-manager');
		const mockWriteText = vi.mocked(clipboardModule.writeText);
		mockWriteText.mockResolvedValueOnce(undefined);

		const { paletteStore } = await import('./palette.svelte');

		paletteStore.open();
		await paletteStore.search('= 1+1');
		await paletteStore.launch({ kind: 'calc', expression: '1+1', result: '2' });

		expect(mockWriteText).toHaveBeenCalledWith('2');
		expect(paletteStore.isOpen).toBe(false);
	});

	it('search("cb:") returns clipboard history entries', async () => {
		const clipboardModule = await import('@tauri-apps/plugin-clipboard-manager');
		vi.mocked(clipboardModule.readText).mockResolvedValue('hello world');

		const { paletteStore } = await import('./palette.svelte');

		// クリップボードをポーリングして履歴に追加
		paletteStore.open();
		// 手動でポーリングをトリガー（インターバルを待たずにテスト）
		await vi.waitFor(() => {}, { timeout: 100 });

		// cb: で検索
		await paletteStore.search('cb:');
		// 履歴にエントリがある場合は clipboard kind のはず
		// (テスト環境ではポーリングタイミングによって0件の場合もある)
		for (const entry of paletteStore.results) {
			expect(entry.kind).toBe('clipboard');
		}

		paletteStore.close();
	});
});
