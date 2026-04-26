import { describe, expect, it } from 'vitest';
import { computeResize, type Rect } from './resize-delta';

const start: Rect = { x: 5, y: 5, w: 2, h: 2 };

describe('computeResize - east (右辺)', () => {
	it('positive dx grows w', () => {
		expect(computeResize(start, 1, 0, 'e').w).toBe(3);
	});
	it('negative dx shrinks w', () => {
		expect(computeResize(start, -1, 0, 'e').w).toBe(1);
	});
	it('clamp to maxSpan', () => {
		expect(computeResize(start, 99, 0, 'e').w).toBe(4);
	});
	it('does not change x or h or y', () => {
		const r = computeResize(start, 2, 99, 'e');
		expect(r.x).toBe(5);
		expect(r.y).toBe(5);
		expect(r.h).toBe(2);
	});
});

describe('computeResize - west (左辺)', () => {
	it('positive dx (drag right) shrinks w + grows x', () => {
		const r = computeResize(start, 1, 0, 'w');
		expect(r.w).toBe(1);
		expect(r.x).toBe(6);
	});
	it('negative dx (drag left) grows w + shrinks x', () => {
		const r = computeResize(start, -1, 0, 'w');
		expect(r.w).toBe(3);
		expect(r.x).toBe(4);
	});
	it('x cannot go negative', () => {
		const r = computeResize({ x: 0, y: 0, w: 2, h: 2 }, -99, 0, 'w');
		expect(r.x).toBeGreaterThanOrEqual(0);
	});
});

describe('computeResize - north (上辺)', () => {
	it('positive dy (drag down) shrinks h + grows y', () => {
		const r = computeResize(start, 0, 1, 'n');
		expect(r.h).toBe(1);
		expect(r.y).toBe(6);
	});
	it('negative dy (drag up) grows h + shrinks y', () => {
		const r = computeResize(start, 0, -1, 'n');
		expect(r.h).toBe(3);
		expect(r.y).toBe(4);
	});
});

describe('computeResize - corner (nw, ne, sw, se)', () => {
	it('se: positive dx/dy grows both', () => {
		const r = computeResize(start, 1, 1, 'se');
		expect(r.w).toBe(3);
		expect(r.h).toBe(3);
		expect(r.x).toBe(5);
		expect(r.y).toBe(5);
	});
	it('nw: negative dx/dy grows both with x/y shift', () => {
		const r = computeResize(start, -1, -1, 'nw');
		expect(r.w).toBe(3);
		expect(r.h).toBe(3);
		expect(r.x).toBe(4);
		expect(r.y).toBe(4);
	});
	it('ne: positive dx grows w, negative dy grows h with y shift', () => {
		const r = computeResize(start, 1, -1, 'ne');
		expect(r.w).toBe(3);
		expect(r.h).toBe(3);
		expect(r.x).toBe(5);
		expect(r.y).toBe(4);
	});
	it('sw: negative dx grows w with x shift, positive dy grows h', () => {
		const r = computeResize(start, -1, 1, 'sw');
		expect(r.w).toBe(3);
		expect(r.h).toBe(3);
		expect(r.x).toBe(4);
		expect(r.y).toBe(5);
	});
});

describe('computeResize - clamp boundaries', () => {
	it('w cannot go below 1', () => {
		expect(computeResize(start, -99, 0, 'e').w).toBe(1);
	});
	it('h cannot go below 1', () => {
		expect(computeResize(start, 0, -99, 's').h).toBe(1);
	});
});
