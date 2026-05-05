import { describe, expect, it } from 'vitest';
import { fuzzyFilter, fuzzyScore } from './fuzzy-search';

describe('fuzzyScore', () => {
	it('空 needle は 1 (空 query は全 match)', () => {
		expect(fuzzyScore('', 'hello')).toBe(1);
	});

	it('完全一致は 1', () => {
		expect(fuzzyScore('hello', 'hello')).toBe(1);
	});

	it('case-insensitive で完全一致', () => {
		expect(fuzzyScore('Hello', 'HELLO')).toBe(1);
	});

	it('startsWith は 0.95', () => {
		expect(fuzzyScore('hel', 'hello')).toBe(0.95);
	});

	it('includes (中間一致) は 0.85', () => {
		expect(fuzzyScore('lo wo', 'hello world')).toBe(0.85);
	});

	it('subsequence (飛び飛び) は 0.5-0.84', () => {
		const s = fuzzyScore('hwd', 'hello world');
		expect(s).toBeGreaterThan(0);
		expect(s).toBeLessThanOrEqual(0.84);
	});

	it('一致なし (順序違反) は 0', () => {
		expect(fuzzyScore('zyx', 'abc')).toBe(0);
	});

	it('長すぎる needle は 0', () => {
		expect(fuzzyScore('helloworld', 'hi')).toBe(0);
	});

	it('startsWith は subsequence より高 score', () => {
		expect(fuzzyScore('vsc', 'vscode')).toBeGreaterThan(fuzzyScore('vsc', 'visual code studio'));
	});
});

describe('fuzzyFilter', () => {
	const items = [
		{ id: '1', label: 'VSCode', target: '/apps/vscode', aliases: ['ide', 'editor'] },
		{ id: '2', label: 'Photoshop', target: '/apps/ps', aliases: ['ps', 'photo'] },
		{ id: '3', label: 'Chrome', target: '/apps/chrome', aliases: ['browser'] },
		{ id: '4', label: 'Firefox', target: '/apps/firefox', aliases: ['fox'] },
	];
	const scoreOf = (item: (typeof items)[number]) => [item.label, item.target, ...item.aliases];

	it('空 query は原順序を保つ', () => {
		const r = fuzzyFilter(items, '', scoreOf);
		expect(r).toEqual(items);
	});

	it('label 一致が score 順で上に', () => {
		const r = fuzzyFilter(items, 'chrome', scoreOf);
		expect(r[0].id).toBe('3');
	});

	it('alias 一致でも match する', () => {
		const r = fuzzyFilter(items, 'fox', scoreOf);
		expect(r.some((x) => x.id === '4')).toBe(true);
	});

	it('target 一致でも match する', () => {
		const r = fuzzyFilter(items, 'vscode', scoreOf);
		expect(r.some((x) => x.id === '1')).toBe(true);
	});

	it('一致なしは空配列', () => {
		const r = fuzzyFilter(items, 'xyz', scoreOf);
		expect(r).toEqual([]);
	});

	it('case-insensitive', () => {
		const r = fuzzyFilter(items, 'CHROME', scoreOf);
		expect(r[0].id).toBe('3');
	});
});
