import { describe, expect, it } from 'vitest';
import { bufferToSparklinePath, pushBuffer } from './history-buffer';

describe('pushBuffer', () => {
	it('appends within capacity', () => {
		expect(pushBuffer([1, 2], 3, 10)).toEqual([1, 2, 3]);
	});

	it('drops oldest when at capacity', () => {
		expect(pushBuffer([1, 2, 3], 4, 3)).toEqual([2, 3, 4]);
	});

	it('drops multiple olds when buffer exceeds cap (post-shrink)', () => {
		expect(pushBuffer([1, 2, 3, 4, 5], 6, 2)).toEqual([5, 6]);
	});

	it('clamps maxSize to [1, 1000]', () => {
		expect(pushBuffer([], 1, 0)).toEqual([1]);
		expect(pushBuffer([], 1, 99999).length).toBe(1);
	});
});

describe('bufferToSparklinePath', () => {
	it('returns empty string for empty input', () => {
		expect(bufferToSparklinePath([], 100, 20)).toBe('');
	});

	it('renders a single point as M command', () => {
		const p = bufferToSparklinePath([50], 100, 20);
		expect(p.startsWith('M')).toBe(true);
		expect(p.includes('L')).toBe(false);
	});

	it('renders multi-point path with M then L commands', () => {
		const p = bufferToSparklinePath([0, 50, 100], 100, 20);
		expect(p.split(' ').length).toBe(3);
		expect(p.startsWith('M')).toBe(true);
		expect(p.split(' ')[1].startsWith('L')).toBe(true);
	});

	it('clamps values within [0, maxValue]', () => {
		const p = bufferToSparklinePath([-50, 200], 100, 20, 100);
		// y for -50 should clamp to height (bottom), 200 to 0 (top)
		expect(p).toContain(',20');
		expect(p).toContain(',0');
	});
});
