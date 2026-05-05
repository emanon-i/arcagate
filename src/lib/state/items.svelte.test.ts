import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Item, LibraryStats } from '$lib/types/item';
import type { Tag, TagWithCount } from '$lib/types/tag';

const listItemsMock = vi.fn<() => Promise<Item[]>>();
const createItemMock = vi.fn<(input: unknown) => Promise<Item>>();
const updateItemMock = vi.fn<(id: string, input: unknown) => Promise<Item>>();
const deleteItemMock = vi.fn<(id: string) => Promise<void>>();
const toggleStarMock = vi.fn<(id: string, starred: boolean) => Promise<Item>>();
const getLibraryStatsMock = vi.fn<() => Promise<LibraryStats>>();
const getTagWithCountsMock = vi.fn<() => Promise<TagWithCount[]>>();
const getTagsMock = vi.fn<() => Promise<Tag[]>>();
const createTagMock = vi.fn<(input: unknown) => Promise<Tag>>();
const searchItemsInTagMock = vi.fn<(tagId: string, query: string) => Promise<Item[]>>();
const getItemsMetadataBatchMock = vi.fn(() => Promise.resolve([]));

vi.mock('$lib/ipc/items', () => ({
	listItems: () => listItemsMock(),
	createItem: (input: unknown) => createItemMock(input),
	updateItem: (id: string, input: unknown) => updateItemMock(id, input),
	deleteItem: (id: string) => deleteItemMock(id),
	toggleStar: (id: string, starred: boolean) => toggleStarMock(id, starred),
	getLibraryStats: () => getLibraryStatsMock(),
	getTagWithCounts: () => getTagWithCountsMock(),
	getTags: () => getTagsMock(),
	createTag: (input: unknown) => createTagMock(input),
	searchItemsInTag: (tagId: string, query: string) => searchItemsInTagMock(tagId, query),
	getItemsMetadataBatch: () => getItemsMetadataBatchMock(),
}));

const sampleItem = (id: string, label = 'item'): Item => ({
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

const sampleStats: LibraryStats = {
	total_items: 0,
	total_tags: 0,
	recent_launch_count: 0,
};

const sampleTagWithCount = (id: string, count: number): TagWithCount => ({
	id,
	name: id,
	prefix: null,
	icon: null,
	is_system: false,
	item_count: count,
});

beforeEach(() => {
	vi.resetModules();
	listItemsMock.mockReset().mockResolvedValue([]);
	createItemMock.mockReset();
	updateItemMock.mockReset();
	deleteItemMock.mockReset().mockResolvedValue();
	toggleStarMock.mockReset();
	getLibraryStatsMock.mockReset().mockResolvedValue({ ...sampleStats });
	getTagWithCountsMock.mockReset().mockResolvedValue([]);
	getTagsMock.mockReset().mockResolvedValue([]);
	createTagMock.mockReset();
	searchItemsInTagMock.mockReset().mockResolvedValue([]);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('itemStore.loadItems', () => {
	it('listItems の結果を items に反映する', async () => {
		listItemsMock.mockResolvedValue([sampleItem('a'), sampleItem('b')]);
		const { itemStore } = await import('./items.svelte');
		await itemStore.loadItems();
		expect(itemStore.items.map((i) => i.id)).toEqual(['a', 'b']);
		expect(itemStore.error).toBeNull();
	});

	it('IPC 失敗で error を立てる', async () => {
		listItemsMock.mockRejectedValue(new Error('boom'));
		const { itemStore } = await import('./items.svelte');
		await itemStore.loadItems();
		expect(itemStore.error).toBe('boom');
	});
});

describe('itemStore.createItem', () => {
	it('IPC 結果を items に append + sidebar stats を refresh', async () => {
		createItemMock.mockResolvedValue(sampleItem('new'));
		getLibraryStatsMock.mockResolvedValue({ ...sampleStats, total_items: 1 });
		getTagWithCountsMock.mockResolvedValue([sampleTagWithCount('tag1', 5)]);
		const { itemStore } = await import('./items.svelte');
		await itemStore.createItem({ item_type: 'url', label: 'x' } as never);
		expect(itemStore.items.find((i) => i.id === 'new')).toBeTruthy();
		expect(itemStore.libraryStats?.total_items).toBe(1);
		expect(itemStore.tagWithCounts).toHaveLength(1);
	});

	it('IPC 失敗で error 立てて items は変更しない', async () => {
		createItemMock.mockRejectedValue(new Error('db error'));
		const { itemStore } = await import('./items.svelte');
		await itemStore.createItem({ item_type: 'url', label: 'x' } as never);
		expect(itemStore.error).toBe('db error');
		expect(itemStore.items).toHaveLength(0);
	});
});

describe('itemStore.updateItem', () => {
	it('items 内の対応 id を置換 + sidebar stats refresh', async () => {
		listItemsMock.mockResolvedValue([sampleItem('a', 'old')]);
		updateItemMock.mockResolvedValue(sampleItem('a', 'new'));
		const { itemStore } = await import('./items.svelte');
		await itemStore.loadItems();
		await itemStore.updateItem('a', { label: 'new' } as never);
		expect(itemStore.items.find((i) => i.id === 'a')?.label).toBe('new');
	});
});

describe('itemStore.toggleStar', () => {
	it('IPC 結果を items に反映 + tagWithCounts refresh', async () => {
		listItemsMock.mockResolvedValue([sampleItem('a')]);
		const updated = sampleItem('a', 'a');
		toggleStarMock.mockResolvedValue(updated);
		getTagWithCountsMock.mockResolvedValue([sampleTagWithCount('sys-starred', 1)]);
		const { itemStore } = await import('./items.svelte');
		await itemStore.loadItems();
		await itemStore.toggleStar('a', true);
		expect(toggleStarMock).toHaveBeenCalledWith('a', true);
		expect(itemStore.tagWithCounts.find((t) => t.id === 'sys-starred')?.item_count).toBe(1);
	});
});

describe('itemStore.deleteItem', () => {
	it('items から該当 id を削除 + sidebar stats refresh', async () => {
		listItemsMock.mockResolvedValue([sampleItem('a'), sampleItem('b')]);
		const { itemStore } = await import('./items.svelte');
		await itemStore.loadItems();
		await itemStore.deleteItem('a');
		expect(itemStore.items.map((i) => i.id)).toEqual(['b']);
	});

	it('IPC 失敗で error、items は変化なし', async () => {
		listItemsMock.mockResolvedValue([sampleItem('a')]);
		deleteItemMock.mockRejectedValue(new Error('locked'));
		const { itemStore } = await import('./items.svelte');
		await itemStore.loadItems();
		await itemStore.deleteItem('a');
		expect(itemStore.error).toBe('locked');
		expect(itemStore.items.map((i) => i.id)).toEqual(['a']);
	});
});

describe('itemStore.loadItemsByTag / loadTags / loadLibraryStats / loadTagWithCounts', () => {
	it('loadItemsByTag は tagItems に反映', async () => {
		searchItemsInTagMock.mockResolvedValue([sampleItem('t1')]);
		const { itemStore } = await import('./items.svelte');
		await itemStore.loadItemsByTag('tag-x', '');
		expect(itemStore.tagItems.map((i) => i.id)).toEqual(['t1']);
	});

	it('loadTags は tags に反映', async () => {
		const tags: Tag[] = [
			{
				id: 't1',
				name: 'a',
				prefix: null,
				icon: null,
				is_hidden: false,
				is_system: false,
				sort_order: 0,
				created_at: '2026-05-04T00:00:00Z',
			},
		];
		getTagsMock.mockResolvedValue(tags);
		const { itemStore } = await import('./items.svelte');
		await itemStore.loadTags();
		expect(itemStore.tags).toEqual(tags);
	});

	it('loadLibraryStats は libraryStats に反映', async () => {
		getLibraryStatsMock.mockResolvedValue({
			total_items: 5,
			total_tags: 2,
			recent_launch_count: 3,
		});
		const { itemStore } = await import('./items.svelte');
		await itemStore.loadLibraryStats();
		expect(itemStore.libraryStats?.total_items).toBe(5);
	});

	it('loadTagWithCounts は tagWithCounts に反映', async () => {
		getTagWithCountsMock.mockResolvedValue([sampleTagWithCount('a', 3)]);
		const { itemStore } = await import('./items.svelte');
		await itemStore.loadTagWithCounts();
		expect(itemStore.tagWithCounts).toHaveLength(1);
	});
});

describe('itemStore.createTag', () => {
	it('tags に append + sidebar stats refresh', async () => {
		const newTag: Tag = {
			id: 't1',
			name: 'newtag',
			prefix: null,
			icon: null,
			is_hidden: false,
			is_system: false,
			sort_order: 0,
			created_at: '2026-05-04T00:00:00Z',
		};
		createTagMock.mockResolvedValue(newTag);
		const { itemStore } = await import('./items.svelte');
		await itemStore.createTag({ name: 'newtag' } as never);
		expect(itemStore.tags).toEqual([newTag]);
	});
});

describe('itemStore.refreshSidebarStats (best-effort)', () => {
	it('createItem 中に getLibraryStats が失敗しても items は確定する', async () => {
		createItemMock.mockResolvedValue(sampleItem('new'));
		getLibraryStatsMock.mockRejectedValue(new Error('stats fail'));
		const { itemStore } = await import('./items.svelte');
		await itemStore.createItem({ item_type: 'url', label: 'x' } as never);
		expect(itemStore.items.find((i) => i.id === 'new')).toBeTruthy();
		// stats 失敗は silent、error は立たない (best-effort)
		expect(itemStore.error).toBeNull();
	});
});
