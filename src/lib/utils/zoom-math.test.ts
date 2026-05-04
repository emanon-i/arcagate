import { describe, expect, it } from 'vitest';
import {
	BASE_H,
	BASE_W,
	cellStrideX,
	cellStrideY,
	clampZoom,
	computeBoundingBox,
	computeOrigin,
	GRID_GAP,
	INNER_PAD,
	MAX_ZOOM,
	MIN_ZOOM,
	RESET_ZOOM,
	TOP_RESERVE,
} from './zoom-math';

describe('zoom-math: clampZoom', () => {
	it('clamps below MIN_ZOOM to MIN_ZOOM', () => {
		expect(clampZoom(0)).toBe(MIN_ZOOM);
		expect(clampZoom(-50)).toBe(MIN_ZOOM);
		expect(clampZoom(MIN_ZOOM - 1)).toBe(MIN_ZOOM);
	});
	it('clamps above MAX_ZOOM to MAX_ZOOM', () => {
		expect(clampZoom(500)).toBe(MAX_ZOOM);
		expect(clampZoom(MAX_ZOOM + 1)).toBe(MAX_ZOOM);
	});
	it('rounds to integer', () => {
		expect(clampZoom(100.4)).toBe(100);
		expect(clampZoom(100.5)).toBe(101);
		expect(clampZoom(31.7)).toBe(32);
	});
	it('preserves integer in range', () => {
		expect(clampZoom(MIN_ZOOM)).toBe(MIN_ZOOM);
		expect(clampZoom(RESET_ZOOM)).toBe(RESET_ZOOM);
		expect(clampZoom(MAX_ZOOM)).toBe(MAX_ZOOM);
		expect(clampZoom(75)).toBe(75);
	});
	it('accepts non-5-multiple values (Q5: 5 単位 round 撤廃)', () => {
		// 73% は 5 の倍数でないが、clampZoom は raw 値を返す (drift しない)
		expect(clampZoom(73)).toBe(73);
		expect(clampZoom(31)).toBe(31);
		expect(clampZoom(199)).toBe(199);
	});
});

describe('zoom-math: cellStride', () => {
	it('matches grid render formula at 100%', () => {
		expect(cellStrideX(100)).toBe(BASE_W + GRID_GAP); // 256
		expect(cellStrideY(100)).toBe(BASE_H + GRID_GAP); // 151
	});
	it('halves at 50%', () => {
		// BASE_W=240 × 0.50 = 120 (round invariant) + GAP 16 = 136
		expect(cellStrideX(50)).toBe(120 + GRID_GAP);
		// BASE_H=135 × 0.50 = 67.5 → Math.round half-up → 68 + GAP 16 = 84
		expect(cellStrideY(50)).toBe(68 + GRID_GAP);
	});
	it('matches Math.round at 33%', () => {
		// BASE_W=240 × 0.33 = 79.2 → round = 79
		expect(cellStrideX(33)).toBe(79 + GRID_GAP);
	});
	it('handles 73% (5 単位でない zoom、Q5 確定で raw zoom が必要)', () => {
		// BASE_W=240 × 0.73 = 175.2 → round = 175 + GAP 16 = 191
		expect(cellStrideX(73)).toBe(175 + GRID_GAP);
		// BASE_H=135 × 0.73 = 98.55 → round = 99 + GAP 16 = 115
		expect(cellStrideY(73)).toBe(99 + GRID_GAP);
	});
});

describe('zoom-math: computeBoundingBox', () => {
	it('returns null for empty', () => {
		expect(computeBoundingBox([])).toBeNull();
	});
	it('handles single widget', () => {
		const bb = computeBoundingBox([{ position_x: 5, position_y: 10, width: 2, height: 3 }]);
		expect(bb).toEqual({ minX: 5, minY: 10, maxX: 7, maxY: 13 });
	});
	it('aggregates multi widgets', () => {
		const bb = computeBoundingBox([
			{ position_x: 0, position_y: 0, width: 2, height: 2 },
			{ position_x: 5, position_y: 8, width: 3, height: 1 },
			{ position_x: 2, position_y: 4, width: 1, height: 5 },
		]);
		expect(bb).toEqual({ minX: 0, minY: 0, maxX: 8, maxY: 9 });
	});
});

describe('zoom-math: computeOrigin', () => {
	it('returns BB center as fractional cells', () => {
		expect(computeOrigin({ minX: 0, minY: 0, maxX: 10, maxY: 6 })).toEqual({
			cellX: 5,
			cellY: 3,
		});
	});
	it('handles odd spans (fractional center)', () => {
		expect(computeOrigin({ minX: 1, minY: 2, maxX: 4, maxY: 9 })).toEqual({
			cellX: 2.5,
			cellY: 5.5,
		});
	});
});

// constants は契約として安定。値変更時は意図的な breaking change なので test で固定。
describe('zoom-math: constants', () => {
	it('exports expected values', () => {
		expect(BASE_W).toBe(240);
		expect(BASE_H).toBe(135);
		expect(GRID_GAP).toBe(16);
		expect(INNER_PAD).toBe(20);
		expect(MIN_ZOOM).toBe(25);
		expect(MAX_ZOOM).toBe(200);
		expect(RESET_ZOOM).toBe(100);
		expect(TOP_RESERVE).toBe(80);
	});
});
