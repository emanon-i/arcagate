import { describe, expect, it } from 'vitest';
import { fuzzyFilter, fuzzyScore } from './fuzzy-search';

/**
 * T4-1 (PR-Z2): fuzzyScore pure function test。
 * T4-2 (PR-Z3): fuzzyFilter (score sort + 0 除外) test 追加。
 *
 * 引用元: docs/l1_requirements/test-rebuild/index.md (T4 phase、core utility)
 *
 * scope: needle/haystack の score 計算 + items 配列を score 順にソートする filter。
 */
describe('fuzzyScore', () => {
	it('exact match は 1', () => {
		expect(fuzzyScore('foo', 'foo')).toBe(1);
	});

	it('prefix match は 0.95', () => {
		expect(fuzzyScore('foo', 'foobar')).toBe(0.95);
	});

	it('substring match は 0.85', () => {
		expect(fuzzyScore('bar', 'foobar')).toBe(0.85);
	});

	it('case-insensitive (大文字 vs 小文字)', () => {
		expect(fuzzyScore('FOO', 'foobar')).toBe(0.95);
		expect(fuzzyScore('foo', 'FooBar')).toBe(0.95);
	});

	it('subsequence match は exact / prefix / substring より低い', () => {
		const subseq = fuzzyScore('fb', 'foobar');
		expect(subseq).toBeGreaterThan(0);
		expect(subseq).toBeLessThan(0.85);
	});

	it('match 不在 (subsequence なし) は 0', () => {
		expect(fuzzyScore('xyz', 'foobar')).toBe(0);
	});

	it('空 needle は 1 (no-op の意味で全件 hit 扱い)', () => {
		expect(fuzzyScore('', 'foobar')).toBe(1);
	});
});

describe('fuzzyFilter', () => {
	type Item = { id: string; label: string; aliases: string[] };
	const items: Item[] = [
		{ id: '1', label: 'Visual Studio Code', aliases: ['code', 'vscode'] },
		{ id: '2', label: 'Visual Studio', aliases: ['vs'] },
		{ id: '3', label: 'Vim', aliases: [] },
		{ id: '4', label: 'Notepad', aliases: ['notes'] },
	];
	const scoreOf = (i: Item) => [i.label, ...i.aliases];

	it('空 query は items そのまま (no-op)', () => {
		expect(fuzzyFilter(items, '', scoreOf)).toEqual(items);
		expect(fuzzyFilter(items, '   ', scoreOf)).toEqual(items);
	});

	it('exact match の item を score 順で返す', () => {
		const r = fuzzyFilter(items, 'vim', scoreOf);
		expect(r[0].id).toBe('3');
	});

	it('aliases も match 対象', () => {
		const r = fuzzyFilter(items, 'vscode', scoreOf);
		expect(r[0].id).toBe('1');
	});

	it('match 不在は空配列', () => {
		expect(fuzzyFilter(items, 'xyzabc', scoreOf)).toEqual([]);
	});

	it('同 score は元 index で安定 sort (Codex L2-C #1)', () => {
		// 'visual' は item 1 と 2 に prefix match (両方 0.95)、tie-break で原順序 (1 → 2)
		const r = fuzzyFilter(items, 'visual', scoreOf);
		expect(r.map((i) => i.id)).toEqual(['1', '2']);
	});
});
