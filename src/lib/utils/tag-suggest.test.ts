import { describe, expect, it } from 'vitest';
import { filterTagSuggestions, isExistingTag, type TagSuggestion } from './tag-suggest';

const tags: TagSuggestion[] = [
	{ id: '1', name: 'work' },
	{ id: '2', name: 'workspace' },
	{ id: '3', name: 'home' },
	{ id: '4', name: 'browser' },
	{ id: '5', name: 'browse-history' },
];

describe('filterTagSuggestions', () => {
	it('returns all tags (limited) when query is empty', () => {
		expect(filterTagSuggestions(tags, '', new Set())).toHaveLength(5);
	});

	it('prefix matches come before contains matches', () => {
		const out = filterTagSuggestions(tags, 'work', new Set());
		expect(out.map((t) => t.name)).toEqual(['work', 'workspace']);
	});

	it('contains matches included after prefix matches', () => {
		const out = filterTagSuggestions(tags, 'rowse', new Set());
		expect(out.map((t) => t.name)).toEqual(['browser', 'browse-history']);
	});

	it('case insensitive', () => {
		const out = filterTagSuggestions(tags, 'WORK', new Set());
		expect(out.map((t) => t.name)).toContain('work');
	});

	it('excludes already selected tags', () => {
		const out = filterTagSuggestions(tags, 'work', new Set(['1']));
		expect(out.map((t) => t.name)).toEqual(['workspace']);
	});

	it('respects limit', () => {
		const big = Array.from({ length: 20 }, (_, i) => ({ id: `${i}`, name: `tag${i}` }));
		const out = filterTagSuggestions(big, '', new Set(), 3);
		expect(out).toHaveLength(3);
	});
});

describe('isExistingTag', () => {
	it('returns true for exact match (case insensitive)', () => {
		expect(isExistingTag(tags, 'WORK')).toBe(true);
	});

	it('returns false for non-existent', () => {
		expect(isExistingTag(tags, 'gaming')).toBe(false);
	});

	it('returns true for empty (suppresses "create new" affordance)', () => {
		expect(isExistingTag(tags, '')).toBe(true);
	});

	it('returns false for partial match (workspace ≠ work prefix only)', () => {
		expect(isExistingTag(tags, 'wo')).toBe(false);
	});
});
