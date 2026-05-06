import { describe, expect, it } from 'vitest';
import { clampZoom, computeBoundingBox, computeOrigin, MAX_ZOOM, MIN_ZOOM } from './zoom-math';

/**
 * T4-1 (PR-Z2): zoom-math pure function test。
 *
 * 引用元: docs/l1_requirements/test-rebuild/index.md (T4 phase、useWidgetZoom 抜本書き直し系)
 *
 * scope: clampZoom が MIN/MAX 範囲内に丸めること、computeBoundingBox / computeOrigin が
 * widget 配列から正しい BB / 重心セル座標を返すこと。
 */
describe('clampZoom', () => {
	it('範囲内はそのまま (整数)', () => {
		expect(clampZoom(100)).toBe(100);
		expect(clampZoom(50)).toBe(50);
		expect(clampZoom(200)).toBe(200);
	});

	it('MIN 未満は MIN に clamp', () => {
		expect(clampZoom(MIN_ZOOM - 1)).toBe(MIN_ZOOM);
		expect(clampZoom(0)).toBe(MIN_ZOOM);
		expect(clampZoom(-100)).toBe(MIN_ZOOM);
	});

	it('MAX 超過は MAX に clamp', () => {
		expect(clampZoom(MAX_ZOOM + 1)).toBe(MAX_ZOOM);
		expect(clampZoom(500)).toBe(MAX_ZOOM);
	});

	it('小数は四捨五入', () => {
		expect(clampZoom(99.4)).toBe(99);
		expect(clampZoom(99.6)).toBe(100);
	});
});

describe('computeBoundingBox', () => {
	it('空配列は null', () => {
		expect(computeBoundingBox([])).toBeNull();
	});

	it('1 widget は widget 自体の bounds', () => {
		const bb = computeBoundingBox([{ position_x: 2, position_y: 3, width: 4, height: 2 }]);
		expect(bb).toEqual({ minX: 2, minY: 3, maxX: 6, maxY: 5 });
	});

	it('複数 widget は全体 enclosing box', () => {
		const bb = computeBoundingBox([
			{ position_x: 0, position_y: 0, width: 2, height: 2 },
			{ position_x: 10, position_y: 5, width: 3, height: 3 },
			{ position_x: 4, position_y: 8, width: 1, height: 1 },
		]);
		expect(bb).toEqual({ minX: 0, minY: 0, maxX: 13, maxY: 9 });
	});
});

describe('computeOrigin', () => {
	it('BB の中心セル座標 (中央) を返す', () => {
		const origin = computeOrigin({ minX: 0, minY: 0, maxX: 10, maxY: 6 });
		// 中心は (5, 3) 系の cell index
		expect(origin.cellX).toBe(5);
		expect(origin.cellY).toBe(3);
	});

	it('1 widget でも中心は widget の中央', () => {
		const origin = computeOrigin({ minX: 2, minY: 3, maxX: 6, maxY: 5 });
		expect(origin.cellX).toBe(4);
		expect(origin.cellY).toBe(4);
	});
});
