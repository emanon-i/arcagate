import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ItemMetadata } from '$lib/types/item-metadata';

const batchMock = vi.fn<(ids: string[]) => Promise<Array<[string, ItemMetadata]>>>();

vi.mock('$lib/ipc/items', () => ({
	getItemsMetadataBatch: (ids: string[]) => batchMock(ids),
}));

beforeEach(() => {
	vi.resetModules();
	batchMock.mockReset();
});

afterEach(() => {
	vi.useRealTimers();
});

const sample = (id: string): ItemMetadata => ({
	sizeBytes: 100,
	urlDomain: id,
});

describe('metadataStore', () => {
	it('cache miss は batch IPC を 1 回だけ呼ぶ', async () => {
		batchMock.mockResolvedValueOnce([
			['a', sample('a')],
			['b', sample('b')],
		]);
		const { metadataStore } = await import('./metadata.svelte');

		await metadataStore.loadMetadataForItems(['a', 'b']);

		expect(batchMock).toHaveBeenCalledTimes(1);
		expect(batchMock).toHaveBeenCalledWith(['a', 'b']);
		expect(metadataStore.getMetadata('a')).toEqual(sample('a'));
		expect(metadataStore.getMetadata('b')).toEqual(sample('b'));
	});

	it('cache hit (TTL 内) は IPC を呼ばない', async () => {
		batchMock.mockResolvedValueOnce([['a', sample('a')]]);
		const { metadataStore } = await import('./metadata.svelte');

		await metadataStore.loadMetadataForItems(['a']);
		expect(batchMock).toHaveBeenCalledTimes(1);

		await metadataStore.loadMetadataForItems(['a']);
		expect(batchMock).toHaveBeenCalledTimes(1);
	});

	it('cache 期限切れ後は再 fetch する', async () => {
		vi.useFakeTimers();
		batchMock.mockResolvedValueOnce([['a', sample('a')]]);
		batchMock.mockResolvedValueOnce([['a', sample('a2')]]);
		const { metadataStore } = await import('./metadata.svelte');

		await metadataStore.loadMetadataForItems(['a']);
		expect(metadataStore.getMetadata('a')?.urlDomain).toBe('a');

		vi.advanceTimersByTime(60_001);

		// TTL 切れで getMetadata は null
		expect(metadataStore.getMetadata('a')).toBeNull();

		await metadataStore.loadMetadataForItems(['a']);
		expect(batchMock).toHaveBeenCalledTimes(2);
		expect(metadataStore.getMetadata('a')?.urlDomain).toBe('a2');
	});

	it('cache 済 + 未 cache を混在させると未 cache 分のみ batch する', async () => {
		batchMock.mockResolvedValueOnce([['a', sample('a')]]);
		batchMock.mockResolvedValueOnce([['b', sample('b')]]);
		const { metadataStore } = await import('./metadata.svelte');

		await metadataStore.loadMetadataForItems(['a']);
		await metadataStore.loadMetadataForItems(['a', 'b']);

		expect(batchMock).toHaveBeenCalledTimes(2);
		expect(batchMock).toHaveBeenLastCalledWith(['b']);
	});

	it('invalidate(id) で cache を破棄する', async () => {
		batchMock.mockResolvedValueOnce([['a', sample('a')]]);
		batchMock.mockResolvedValueOnce([['a', sample('a2')]]);
		const { metadataStore } = await import('./metadata.svelte');

		await metadataStore.loadMetadataForItems(['a']);
		metadataStore.invalidate('a');
		await metadataStore.loadMetadataForItems(['a']);

		expect(batchMock).toHaveBeenCalledTimes(2);
		expect(metadataStore.getMetadata('a')?.urlDomain).toBe('a2');
	});

	it('空 ids は IPC を呼ばない', async () => {
		const { metadataStore } = await import('./metadata.svelte');
		await metadataStore.loadMetadataForItems([]);
		expect(batchMock).not.toHaveBeenCalled();
	});
});
