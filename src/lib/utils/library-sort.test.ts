import { describe, expect, it } from 'vitest';
import type { Item } from '$lib/types/item';
import { isValidSortField, isValidSortOrder, sortItems } from './library-sort';

const make = (id: string, label: string, created: string, updated: string): Item => ({
	id,
	item_type: 'url',
	label,
	target: 'x',
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
	created_at: created,
	updated_at: updated,
});

describe('sortItems', () => {
	const items = [
		make('a', 'banana', '2026-01-01T00:00:00Z', '2026-03-01T00:00:00Z'),
		make('b', 'apple', '2026-02-01T00:00:00Z', '2026-01-01T00:00:00Z'),
		make('c', 'cherry', '2026-03-01T00:00:00Z', '2026-02-01T00:00:00Z'),
	];

	it('name asc は ja locale で a < b < c', () => {
		const r = sortItems(items, { field: 'name', order: 'asc' });
		expect(r.map((i) => i.label)).toEqual(['apple', 'banana', 'cherry']);
	});

	it('name desc は逆順', () => {
		const r = sortItems(items, { field: 'name', order: 'desc' });
		expect(r.map((i) => i.label)).toEqual(['cherry', 'banana', 'apple']);
	});

	it('created asc は時系列の昇順', () => {
		const r = sortItems(items, { field: 'created', order: 'asc' });
		expect(r.map((i) => i.id)).toEqual(['a', 'b', 'c']);
	});

	it('created desc は新着順', () => {
		const r = sortItems(items, { field: 'created', order: 'desc' });
		expect(r.map((i) => i.id)).toEqual(['c', 'b', 'a']);
	});

	it('updated desc は最近更新順', () => {
		const r = sortItems(items, { field: 'updated', order: 'desc' });
		expect(r.map((i) => i.id)).toEqual(['a', 'c', 'b']);
	});

	it('原配列を mutate しない (新配列を返す)', () => {
		const before = items.map((i) => i.id);
		sortItems(items, { field: 'name', order: 'desc' });
		expect(items.map((i) => i.id)).toEqual(before);
	});
});

describe('validators', () => {
	it('isValidSortField', () => {
		expect(isValidSortField('name')).toBe(true);
		expect(isValidSortField('created')).toBe(true);
		expect(isValidSortField('updated')).toBe(true);
		expect(isValidSortField('size')).toBe(false);
	});
	it('isValidSortOrder', () => {
		expect(isValidSortOrder('asc')).toBe(true);
		expect(isValidSortOrder('desc')).toBe(true);
		expect(isValidSortOrder('random')).toBe(false);
	});
});
