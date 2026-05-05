import { describe, expect, it } from 'vitest';
import { gridKeyboardNav } from './grid-keyboard';

describe('gridKeyboardNav', () => {
	const base = { selectionMode: false } as const;

	it('total=0 は常に noop', () => {
		const r = gridKeyboardNav({ ...base, key: 'ArrowRight', currentIndex: 0, total: 0, cols: 4 });
		expect(r).toEqual({ type: 'noop' });
	});

	it('ArrowRight で次の index に進む', () => {
		const r = gridKeyboardNav({ ...base, key: 'ArrowRight', currentIndex: 2, total: 10, cols: 4 });
		expect(r).toEqual({ type: 'focus', index: 3 });
	});

	it('ArrowRight 末尾は止まる (clamp)', () => {
		const r = gridKeyboardNav({ ...base, key: 'ArrowRight', currentIndex: 9, total: 10, cols: 4 });
		expect(r).toEqual({ type: 'focus', index: 9 });
	});

	it('ArrowLeft 先頭は止まる', () => {
		const r = gridKeyboardNav({ ...base, key: 'ArrowLeft', currentIndex: 0, total: 10, cols: 4 });
		expect(r).toEqual({ type: 'focus', index: 0 });
	});

	it('ArrowDown は cols 分進む', () => {
		const r = gridKeyboardNav({ ...base, key: 'ArrowDown', currentIndex: 1, total: 10, cols: 4 });
		expect(r).toEqual({ type: 'focus', index: 5 });
	});

	it('ArrowDown 末尾近くは clamp', () => {
		const r = gridKeyboardNav({ ...base, key: 'ArrowDown', currentIndex: 8, total: 10, cols: 4 });
		expect(r).toEqual({ type: 'focus', index: 9 });
	});

	it('ArrowUp は cols 分戻る', () => {
		const r = gridKeyboardNav({ ...base, key: 'ArrowUp', currentIndex: 5, total: 10, cols: 4 });
		expect(r).toEqual({ type: 'focus', index: 1 });
	});

	it('ArrowUp 1 行目は 0 で止まる', () => {
		const r = gridKeyboardNav({ ...base, key: 'ArrowUp', currentIndex: 1, total: 10, cols: 4 });
		expect(r).toEqual({ type: 'focus', index: 0 });
	});

	it('Home で 0、End で末尾', () => {
		expect(gridKeyboardNav({ ...base, key: 'Home', currentIndex: 5, total: 10, cols: 4 })).toEqual({
			type: 'focus',
			index: 0,
		});
		expect(gridKeyboardNav({ ...base, key: 'End', currentIndex: 0, total: 10, cols: 4 })).toEqual({
			type: 'focus',
			index: 9,
		});
	});

	it('Enter は launch (selectionMode=false)', () => {
		const r = gridKeyboardNav({ ...base, key: 'Enter', currentIndex: 3, total: 10, cols: 4 });
		expect(r).toEqual({ type: 'launch', index: 3 });
	});

	it('Enter は toggleSelect (selectionMode=true)', () => {
		const r = gridKeyboardNav({
			key: 'Enter',
			currentIndex: 3,
			total: 10,
			cols: 4,
			selectionMode: true,
		});
		expect(r).toEqual({ type: 'toggleSelect', index: 3 });
	});

	it('Space は selectionMode 中のみ toggleSelect', () => {
		expect(gridKeyboardNav({ ...base, key: ' ', currentIndex: 3, total: 10, cols: 4 })).toEqual({
			type: 'noop',
		});
		expect(
			gridKeyboardNav({
				key: ' ',
				currentIndex: 3,
				total: 10,
				cols: 4,
				selectionMode: true,
			}),
		).toEqual({ type: 'toggleSelect', index: 3 });
	});

	it('Escape は dismiss', () => {
		const r = gridKeyboardNav({ ...base, key: 'Escape', currentIndex: 3, total: 10, cols: 4 });
		expect(r).toEqual({ type: 'dismiss' });
	});

	it('currentIndex=-1 の初回 ArrowRight は 0 から +1 で 1 (start at 0)', () => {
		const r = gridKeyboardNav({
			...base,
			key: 'ArrowRight',
			currentIndex: -1,
			total: 10,
			cols: 4,
		});
		expect(r).toEqual({ type: 'focus', index: 1 });
	});

	it('currentIndex=-1 の Enter は noop (focus 無いため)', () => {
		const r = gridKeyboardNav({
			...base,
			key: 'Enter',
			currentIndex: -1,
			total: 10,
			cols: 4,
		});
		expect(r).toEqual({ type: 'noop' });
	});

	it('cols=1 (list view) で ArrowDown は +1', () => {
		const r = gridKeyboardNav({ ...base, key: 'ArrowDown', currentIndex: 0, total: 5, cols: 1 });
		expect(r).toEqual({ type: 'focus', index: 1 });
	});

	it('cols=0 / NaN は 1 にフォールバック', () => {
		const r = gridKeyboardNav({ ...base, key: 'ArrowDown', currentIndex: 0, total: 5, cols: 0 });
		expect(r).toEqual({ type: 'focus', index: 1 });
	});

	it('未対応キーは noop', () => {
		const r = gridKeyboardNav({ ...base, key: 'Tab', currentIndex: 3, total: 10, cols: 4 });
		expect(r).toEqual({ type: 'noop' });
	});
});
