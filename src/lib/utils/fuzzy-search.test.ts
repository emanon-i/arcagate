import { describe, expect, it } from 'vitest';
import { fuzzyScore } from './fuzzy-search';

/**
 * T4-1 (PR-Z2): fuzzyScore pure function test。
 *
 * 引用元: docs/l1_requirements/test-rebuild/index.md (T4 phase、core utility)
 *
 * scope: needle/haystack の score 計算が想定通りの優先順位 (exact > prefix > substring > subseq)
 * を返すこと。並び順保証 (fuzzyFilter 経由) は別 PR で扱う。
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
