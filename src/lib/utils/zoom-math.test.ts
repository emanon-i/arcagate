import { describe, expect, it } from 'vitest';
import {
	BASE_H,
	BASE_W,
	BUFFER_COLS_LEFT,
	BUFFER_ROWS_TOP,
	bufferOffsetPx,
	cellStrideX,
	cellStrideY,
	clampZoom,
	computeBoundingBox,
	computeFitScroll,
	computeFitZoom,
	computeOrigin,
	GRID_GAP,
	INNER_PAD,
	MAX_ZOOM,
	MIN_ZOOM,
} from './zoom-math';

/**
 * T4-1 (PR-Z2): zoom-math pure function test (clampZoom + computeBoundingBox + computeOrigin)。
 * T4-2 (PR-Z3): cellStrideX / cellStrideY + computeFitZoom test 追加。
 *
 * 引用元: docs/l1_requirements/test-rebuild/index.md (T4 phase、useWidgetZoom 抜本書き直し系)
 *
 * scope: zoom 制御 + cell stride 計算 + Fit zoom (BB が viewport に収まる zoom%)。
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

describe('cellStrideX / cellStrideY', () => {
	it('100% zoom は BASE + GRID_GAP', () => {
		expect(cellStrideX(100)).toBe(BASE_W + GRID_GAP);
		expect(cellStrideY(100)).toBe(BASE_H + GRID_GAP);
	});

	it('50% zoom は半分 + gap', () => {
		expect(cellStrideX(50)).toBe(Math.round(BASE_W * 0.5) + GRID_GAP);
		expect(cellStrideY(50)).toBe(Math.round(BASE_H * 0.5) + GRID_GAP);
	});

	it('200% zoom は 2倍 + gap', () => {
		expect(cellStrideX(200)).toBe(BASE_W * 2 + GRID_GAP);
		expect(cellStrideY(200)).toBe(BASE_H * 2 + GRID_GAP);
	});
});

describe('bufferOffsetPx (2026-05-07 wall fix)', () => {
	it('100% zoom は BUFFER_COLS_LEFT * cellStrideX(100), BUFFER_ROWS_TOP * cellStrideY(100)', () => {
		const buf = bufferOffsetPx(100);
		expect(buf.x).toBe(BUFFER_COLS_LEFT * cellStrideX(100));
		expect(buf.y).toBe(BUFFER_ROWS_TOP * cellStrideY(100));
	});

	it('zoom と一緒に scale する (200% は 2 倍)', () => {
		const buf100 = bufferOffsetPx(100);
		const buf200 = bufferOffsetPx(200);
		// stride は (BASE * zoom/100) + GRID_GAP のため厳密に 2 倍ではないが、
		// 大体 (BASE 部分) は 2 倍。verify cellStrideX 関係。
		expect(buf200.x).toBe(BUFFER_COLS_LEFT * cellStrideX(200));
		expect(buf200.x).toBeGreaterThan(buf100.x);
	});

	it('BUFFER 値は十分大きい (壁が遠い)', () => {
		// 12 cols × 64 rows は実用 viewport (1920×1080) で 1 画面以上の buffer。
		expect(BUFFER_COLS_LEFT).toBeGreaterThanOrEqual(8);
		expect(BUFFER_ROWS_TOP).toBeGreaterThanOrEqual(32);
	});
});

describe('computeFitScroll (buffer 込み)', () => {
	it('widget at (0, 0) は scroll が buffer 分以上、left/top wall を回避', () => {
		// widget (0,0) size (4, 3) → BB = {0, 0, 4, 3}, origin = (2, 1.5)
		const origin = { cellX: 2, cellY: 1.5 };
		const result = computeFitScroll(origin, 100, { clientWidth: 1920, clientHeight: 1080 });
		// buffer (12 cols × ~256 + 64 rows × ~151) → ~3072 / ~9664
		// origin px = INNER_PAD + buffer + origin.cell * stride
		// scrollLeft = max(0, originPxX - viewport_w/2)
		// 期待: scrollLeft >> 0 (buffer のおかげで widget 中央に scroll しても left wall 触らない)
		const buf = bufferOffsetPx(100);
		const expectedScrollLeft =
			INNER_PAD + buf.x + origin.cellX * cellStrideX(100) - GRID_GAP / 2 - 1920 / 2;
		expect(result.scrollLeft).toBeCloseTo(Math.max(0, expectedScrollLeft), 0);
		expect(result.scrollLeft).toBeGreaterThan(buf.x - 1920); // buffer の半分以上は確実に scroll する
	});

	it('viewport が極小でも widget BB を center に置こうとする', () => {
		const origin = { cellX: 5, cellY: 10 };
		const result = computeFitScroll(origin, 100, { clientWidth: 600, clientHeight: 400 });
		expect(result.scrollLeft).toBeGreaterThan(0);
		expect(result.scrollTop).toBeGreaterThan(0);
	});

	it('grid 原点 (0, 0) の widget でも scrollLeft / scrollTop > 0 (壁 回避)', () => {
		// 旧 fix では BB が小さい / top-left 配置 で scroll = 0 にクランプされ「壁」体感していた。
		// 新 fix では buffer のおかげで widget at (0, 0) でも scroll > 0 になる。
		const origin = { cellX: 0.5, cellY: 0.5 }; // 1×1 widget at (0,0)
		const result = computeFitScroll(origin, 100, { clientWidth: 1920, clientHeight: 1080 });
		// buffer.x ≈ 12 * 256 = 3072, viewport_w/2 = 960 → originPx > 960 → scrollLeft > 0
		expect(result.scrollLeft).toBeGreaterThan(0);
		expect(result.scrollTop).toBeGreaterThan(0);
	});
});

describe('computeFitZoom', () => {
	it('BB が viewport より小さければ 100% (RESET) を超えない値を返す', () => {
		const bb = { minX: 0, minY: 0, maxX: 2, maxY: 2 };
		// BB 100% pixel: 2*240 + 16 = 496W, 2*135 + 16 = 286H
		// viewport (1920x1080) で十分収まる → 100% 以上だが clampZoom で 200 max
		const z = computeFitZoom(bb, { clientWidth: 1920, clientHeight: 1080 });
		expect(z).toBeGreaterThanOrEqual(MIN_ZOOM);
		expect(z).toBeLessThanOrEqual(MAX_ZOOM);
	});

	it('BB が viewport より大きければ縮小 (< 100%)', () => {
		// BB 100x100 cells、viewport 800x600 → fit zoom は 100% 未満
		const bb = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
		const z = computeFitZoom(bb, { clientWidth: 800, clientHeight: 600 });
		expect(z).toBeLessThan(100);
		expect(z).toBeGreaterThanOrEqual(MIN_ZOOM);
	});

	it('BB が 0 サイズなら RESET (100)', () => {
		const bb = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
		expect(computeFitZoom(bb, { clientWidth: 1920, clientHeight: 1080 })).toBe(100);
	});
});
