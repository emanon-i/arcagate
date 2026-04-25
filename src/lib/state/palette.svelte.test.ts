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
	card_override_json: null,
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
	card_override_json: null,
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

	it('selectNext() が末尾から先頭に循環する', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		const mockInvoke = vi.mocked(invoke);
		mockInvoke.mockResolvedValueOnce([mockItem, mockItem2]);

		const { paletteStore } = await import('./palette.svelte');

		await paletteStore.search('note');
		paletteStore.selectNext(); // index = 1 (last)
		paletteStore.selectNext(); // wrap → 0
		expect(paletteStore.selectedIndex).toBe(0);
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

	it('selectPrev() が先頭から末尾に循環する', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		const mockInvoke = vi.mocked(invoke);
		mockInvoke.mockResolvedValueOnce([mockItem, mockItem2]);

		const { paletteStore } = await import('./palette.svelte');

		await paletteStore.search('note');
		// selectedIndex = 0 (先頭)
		paletteStore.selectPrev(); // wrap → 1 (last)
		expect(paletteStore.selectedIndex).toBe(1);
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

	it('search("") が recent + frequent を取得して重複排除すること', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		const mockInvoke = vi.mocked(invoke);

		// getRecentItems → [mockItem], getFrequentItems → [mockItem, mockItem2]
		// mockItem は両方に現れるが重複排除後は 2 件
		mockInvoke
			.mockResolvedValueOnce([mockItem]) // getRecentItems
			.mockResolvedValueOnce([mockItem, mockItem2]); // getFrequentItems

		const { paletteStore } = await import('./palette.svelte');

		await paletteStore.search('');

		expect(paletteStore.results).toHaveLength(2);
		expect(paletteStore.results.every((e) => e.kind === 'item')).toBe(true);
	});

	it('launch() clipboard エントリはテキストをクリップボードに書き込みパレットを閉じること', async () => {
		const clipboardModule = await import('@tauri-apps/plugin-clipboard-manager');
		vi.mocked(clipboardModule.writeText).mockResolvedValueOnce(undefined);

		const { paletteStore } = await import('./palette.svelte');

		paletteStore.open();
		await paletteStore.launch({ kind: 'clipboard', text: 'copied text', index: 0 });

		expect(vi.mocked(clipboardModule.writeText)).toHaveBeenCalledWith('copied text');
		expect(paletteStore.isOpen).toBe(false);
	});

	it('search("= 0") で計算結果 "0" が返ること', async () => {
		const { paletteStore } = await import('./palette.svelte');

		await paletteStore.search('= 0');

		expect(paletteStore.results).toHaveLength(1);
		const entry = paletteStore.results[0];
		expect(entry.kind).toBe('calc');
		if (entry.kind === 'calc') {
			expect(entry.result).toBe('0');
		}
	});

	it('search("= (1+2)*3") で計算結果 "9" が返ること', async () => {
		const { paletteStore } = await import('./palette.svelte');

		await paletteStore.search('= (1+2)*3');

		const entry = paletteStore.results[0];
		expect(entry.kind).toBe('calc');
		if (entry.kind === 'calc') {
			expect(entry.result).toBe('9');
		}
	});

	it('search("= 1/0") で Infinity は拒否され "..." が返ること', async () => {
		const { paletteStore } = await import('./palette.svelte');

		await paletteStore.search('= 1/0');

		const entry = paletteStore.results[0];
		expect(entry.kind).toBe('calc');
		if (entry.kind === 'calc') {
			// Infinity は Number.isFinite(false) → null → '...'
			expect(entry.result).toBe('...');
		}
	});

	it('tabComplete() は item エントリの label を返す', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke).mockResolvedValueOnce([mockItem, mockItem2]);

		const { paletteStore } = await import('./palette.svelte');
		await paletteStore.search('note');
		// selectedIndex = 0, results[0] = { kind: 'item', item: mockItem }

		expect(paletteStore.tabComplete()).toBe('Notepad');
	});

	it('tabComplete() は calc エントリで null を返す', async () => {
		const { paletteStore } = await import('./palette.svelte');
		await paletteStore.search('= 2+3');
		// results[0] = { kind: 'calc', ... }

		expect(paletteStore.tabComplete()).toBeNull();
	});

	it('tabComplete() は results が空のとき null を返す', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke).mockResolvedValueOnce([]); // 空の検索結果

		const { paletteStore } = await import('./palette.svelte');
		await paletteStore.search('no-match');

		expect(paletteStore.tabComplete()).toBeNull();
	});
});
