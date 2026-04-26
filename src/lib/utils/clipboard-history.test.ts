import { describe, expect, it } from 'vitest';
import { type ClipboardEntry, deleteClipboardEntry, pushClipboardEntry } from './clipboard-history';

const fixedNow = () => 1_000;

describe('pushClipboardEntry', () => {
	it('adds new entry to front', () => {
		const out = pushClipboardEntry([], 'hello', { maxItems: 10 }, fixedNow);
		expect(out).toHaveLength(1);
		expect(out[0].text).toBe('hello');
	});

	it('skips duplicate of front entry', () => {
		const seed: ClipboardEntry[] = [{ id: 'a', text: 'hello', addedAt: 0 }];
		const out = pushClipboardEntry(seed, 'hello', { maxItems: 10 }, fixedNow);
		expect(out).toBe(seed);
	});

	it('moves existing non-front entry to front (dedupe)', () => {
		const seed: ClipboardEntry[] = [
			{ id: 'a', text: 'world', addedAt: 0 },
			{ id: 'b', text: 'hello', addedAt: 0 },
		];
		const out = pushClipboardEntry(seed, 'hello', { maxItems: 10 }, fixedNow);
		expect(out).toHaveLength(2);
		expect(out[0].text).toBe('hello');
		expect(out[1].text).toBe('world');
	});

	it('respects maxItems and truncates', () => {
		const seed: ClipboardEntry[] = [
			{ id: 'a', text: 'a', addedAt: 0 },
			{ id: 'b', text: 'b', addedAt: 0 },
			{ id: 'c', text: 'c', addedAt: 0 },
		];
		const out = pushClipboardEntry(seed, 'd', { maxItems: 2 }, fixedNow);
		expect(out).toHaveLength(2);
		expect(out[0].text).toBe('d');
		expect(out[1].text).toBe('a');
	});

	it('clamps maxItems to [1, 200]', () => {
		const seed: ClipboardEntry[] = [];
		const out0 = pushClipboardEntry(seed, 'x', { maxItems: 0 }, fixedNow);
		expect(out0).toHaveLength(1);
		const out999 = pushClipboardEntry(seed, 'x', { maxItems: 999 }, fixedNow);
		expect(out999).toHaveLength(1);
	});

	it('skips empty text', () => {
		const out = pushClipboardEntry([], '', { maxItems: 10 }, fixedNow);
		expect(out).toEqual([]);
	});
});

describe('deleteClipboardEntry', () => {
	it('removes entry by id', () => {
		const seed: ClipboardEntry[] = [
			{ id: 'a', text: 'a', addedAt: 0 },
			{ id: 'b', text: 'b', addedAt: 0 },
		];
		const out = deleteClipboardEntry(seed, 'a');
		expect(out).toHaveLength(1);
		expect(out[0].id).toBe('b');
	});

	it('returns same shape when id not found', () => {
		const seed: ClipboardEntry[] = [{ id: 'a', text: 'a', addedAt: 0 }];
		const out = deleteClipboardEntry(seed, 'nope');
		expect(out).toEqual(seed);
	});
});
