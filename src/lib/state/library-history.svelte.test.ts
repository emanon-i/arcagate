import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Item } from '$lib/types/item';

const createItemMock = vi.fn<(input: unknown) => Promise<Item>>();
const deleteItemMock = vi.fn<(id: string) => Promise<void>>();
const listItemsMock = vi.fn<() => Promise<Item[]>>();
const getLibraryStatsMock = vi.fn();
const getTagWithCountsMock = vi.fn();

vi.mock('$lib/ipc/items', () => ({
	createItem: (input: unknown) => createItemMock(input),
	deleteItem: (id: string) => deleteItemMock(id),
	listItems: () => listItemsMock(),
	getLibraryStats: () => getLibraryStatsMock(),
	getTagWithCounts: () => getTagWithCountsMock(),
	// itemStore は items.svelte 内で参照する metadata.svelte の getItemsMetadataBatch も必要
	getItemsMetadataBatch: vi.fn(() => Promise.resolve([])),
}));

const sampleItem = (id: string, label: string): Item => ({
	id,
	item_type: 'url',
	label,
	target: 'https://example.com',
	args: null,
	working_dir: null,
	icon_path: null,
	icon_type: null,
	aliases: [],
	sort_order: 0,
	is_enabled: true,
	is_tracked: false,
	default_app: null,
	card_override_json: null,
	created_at: '2026-05-04T00:00:00Z',
	updated_at: '2026-05-04T00:00:00Z',
});

beforeEach(() => {
	vi.resetModules();
	createItemMock.mockReset();
	deleteItemMock.mockReset();
	listItemsMock.mockReset().mockResolvedValue([]);
	getLibraryStatsMock.mockReset().mockResolvedValue({
		total_items: 0,
		total_tags: 0,
		recent_launch_count: 0,
	});
	getTagWithCountsMock.mockReset().mockResolvedValue([]);
});

afterEach(() => {
	vi.useRealTimers();
});

describe('libraryHistory', () => {
	it('recordDelete で pendingUndo が立つ', async () => {
		const { libraryHistory } = await import('./library-history.svelte');
		expect(libraryHistory.pendingUndo).toBeNull();

		libraryHistory.recordDelete(sampleItem('a', 'Apple'), ['tag1']);
		expect(libraryHistory.pendingUndo?.itemSnapshot.id).toBe('a');
		expect(libraryHistory.pendingUndo?.tagIds).toEqual(['tag1']);
	});

	it('undo 期限内 (< 5s) は createItem を呼ぶ', async () => {
		createItemMock.mockResolvedValue(sampleItem('new-id', 'Apple'));
		const { libraryHistory } = await import('./library-history.svelte');
		libraryHistory.recordDelete(sampleItem('a', 'Apple'), ['tag1']);

		const ok = await libraryHistory.undo();
		expect(ok).toBe(true);
		expect(createItemMock).toHaveBeenCalledOnce();
		const arg = createItemMock.mock.calls[0][0] as Record<string, unknown>;
		expect(arg.label).toBe('Apple');
		expect(arg.tag_ids).toEqual(['tag1']);
		expect(libraryHistory.pendingUndo).toBeNull();
	});

	it('undo は 5 秒経過後 false', async () => {
		vi.useFakeTimers();
		const { libraryHistory } = await import('./library-history.svelte');
		libraryHistory.recordDelete(sampleItem('a', 'Apple'), []);

		vi.advanceTimersByTime(5_001);
		// auto-dismiss の setTimeout は実装内部、advanceTimers で発火する
		const ok = await libraryHistory.undo();
		expect(ok).toBe(false);
		expect(createItemMock).not.toHaveBeenCalled();
		expect(libraryHistory.pendingUndo).toBeNull();
	});

	it('dismiss で pendingUndo が消える', async () => {
		const { libraryHistory } = await import('./library-history.svelte');
		libraryHistory.recordDelete(sampleItem('a', 'Apple'), []);
		libraryHistory.dismiss();
		expect(libraryHistory.pendingUndo).toBeNull();
	});

	it('createItem 失敗時 pendingUndo は維持 (再試行可能)', async () => {
		createItemMock.mockRejectedValue(new Error('db error'));
		const { libraryHistory } = await import('./library-history.svelte');
		libraryHistory.recordDelete(sampleItem('a', 'Apple'), []);

		const ok = await libraryHistory.undo();
		expect(ok).toBe(false);
		expect(libraryHistory.pendingUndo).not.toBeNull();
	});
});
