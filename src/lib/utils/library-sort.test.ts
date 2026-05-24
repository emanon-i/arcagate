import { describe, expect, it } from 'vitest';
import type { Item } from '$lib/types/item';
import { isValidSortField, isValidSortOrder, sortItems } from './library-sort';

/**
 * T4-1 (PR-Z2): library-sort pure function test。
 *
 * 引用元: docs/l1_requirements/test-rebuild/index.md (T4 phase)
 *
 * scope: sortItems が name / created / updated × asc / desc で正しい順序を返すこと。
 * isValidSortField / isValidSortOrder の type guard が valid / invalid 値で動くこと。
 */

function mkItem(o: { id: string; label: string; created_at?: string; updated_at?: string }): Item {
	return {
		id: o.id,
		item_type: 'exe',
		label: o.label,
		target: '',
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
		source_widget_id: null,
		source_entry_key: null,
		created_at: o.created_at ?? '2026-01-01T00:00:00Z',
		updated_at: o.updated_at ?? '2026-01-01T00:00:00Z',
	} as Item;
}

const items: Item[] = [
	mkItem({
		id: '1',
		label: 'Charlie',
		created_at: '2026-01-03T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
	}),
	mkItem({
		id: '2',
		label: 'Alpha',
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-03T00:00:00Z',
	}),
	mkItem({
		id: '3',
		label: 'Bravo',
		created_at: '2026-01-02T00:00:00Z',
		updated_at: '2026-01-02T00:00:00Z',
	}),
];

describe('sortItems', () => {
	it('name asc は label 昇順 (Alpha → Bravo → Charlie)', () => {
		const r = sortItems(items, { field: 'name', order: 'asc' });
		expect(r.map((i) => i.label)).toEqual(['Alpha', 'Bravo', 'Charlie']);
	});

	it('name desc は label 降順 (Charlie → Bravo → Alpha)', () => {
		const r = sortItems(items, { field: 'name', order: 'desc' });
		expect(r.map((i) => i.label)).toEqual(['Charlie', 'Bravo', 'Alpha']);
	});

	it('created asc は created_at 昇順 (Alpha → Bravo → Charlie)', () => {
		const r = sortItems(items, { field: 'created', order: 'asc' });
		expect(r.map((i) => i.label)).toEqual(['Alpha', 'Bravo', 'Charlie']);
	});

	it('updated desc は updated_at 降順 (Alpha → Bravo → Charlie)', () => {
		const r = sortItems(items, { field: 'updated', order: 'desc' });
		expect(r.map((i) => i.label)).toEqual(['Alpha', 'Bravo', 'Charlie']);
	});

	it('元配列を mutate しない', () => {
		const original = [...items];
		sortItems(items, { field: 'name', order: 'asc' });
		expect(items).toEqual(original);
	});
});

describe('isValidSortField / isValidSortOrder', () => {
	it('isValidSortField は 3 値のみ true', () => {
		expect(isValidSortField('name')).toBe(true);
		expect(isValidSortField('created')).toBe(true);
		expect(isValidSortField('updated')).toBe(true);
		expect(isValidSortField('invalid')).toBe(false);
		expect(isValidSortField('')).toBe(false);
	});

	it('isValidSortOrder は asc/desc のみ true', () => {
		expect(isValidSortOrder('asc')).toBe(true);
		expect(isValidSortOrder('desc')).toBe(true);
		expect(isValidSortOrder('ASC')).toBe(false);
		expect(isValidSortOrder('')).toBe(false);
	});
});
