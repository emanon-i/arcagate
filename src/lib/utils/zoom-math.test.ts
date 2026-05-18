import { describe, expect, it } from 'vitest';
import {
	BASE_H,
	BASE_W,
	BOTTOM_RESERVE,
	cellStrideX,
	cellStrideY,
	clampZoom,
	clampZoomFit,
	computeBoundingBox,
	computeFitScroll,
	computeFitZoom,
	computeOrigin,
	computeRenderExtent,
	effectiveBottomReserve,
	GRID_GAP,
	HINT_BAR_RESERVE,
	INNER_PAD,
	MARGIN_CELLS,
	MAX_ZOOM,
	MIN_ZOOM,
	MIN_ZOOM_FIT,
} from './zoom-math';

/**
 * 2026-05-19 無限 canvas: computeFitScroll は render extent (origin) を 4 番目の引数に取る。
 * canvas pixel of cell c = INNER_PAD + (c − extent.originX) × stride。
 * test では「widget 群 → computeRenderExtent」 で実 render origin と同じ extent を作って渡す。
 */
const EXTENT_AT_ORIGIN = computeRenderExtent([
	{ position_x: 0, position_y: 0, width: 4, height: 3 },
]);

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

describe('computeRenderExtent (2026-05-19 無限 canvas)', () => {
	it('空 workspace は (0,0) を中心に 2×MARGIN 四方の grid', () => {
		const ext = computeRenderExtent([]);
		expect(ext).toEqual({
			originX: -MARGIN_CELLS,
			originY: -MARGIN_CELLS,
			cols: 2 * MARGIN_CELLS,
			rows: 2 * MARGIN_CELLS,
		});
	});

	it('widget あり: origin は BB 最小座標 − MARGIN、 extent は BB + 両側 MARGIN', () => {
		const ext = computeRenderExtent([{ position_x: 5, position_y: 8, width: 2, height: 3 }]);
		// BB = {5, 8, 7, 11}
		expect(ext.originX).toBe(5 - MARGIN_CELLS);
		expect(ext.originY).toBe(8 - MARGIN_CELLS);
		expect(ext.cols).toBe(2 + 2 * MARGIN_CELLS);
		expect(ext.rows).toBe(3 + 2 * MARGIN_CELLS);
	});

	it('負座標 widget も BB に含めて origin を伸ばす (無限 canvas の左/上 拡張)', () => {
		const ext = computeRenderExtent([
			{ position_x: -10, position_y: -7, width: 2, height: 2 },
			{ position_x: 3, position_y: 4, width: 2, height: 2 },
		]);
		// BB = {-10, -7, 5, 6}
		expect(ext.originX).toBe(-10 - MARGIN_CELLS);
		expect(ext.originY).toBe(-7 - MARGIN_CELLS);
	});

	it('MARGIN は十分大きく leading pan 余白を確保する', () => {
		expect(MARGIN_CELLS).toBeGreaterThanOrEqual(16);
	});
});

describe('computeFitScroll (render origin 込み)', () => {
	// canvas pixel of cell c = INNER_PAD + (c − extent.originX) × stride。
	it('widget at (0, 0) は MARGIN 分 scroll され、left/top wall を回避', () => {
		// widget (0,0) size (4, 3) → BB = {0, 0, 4, 3}, origin = (2, 1.5)
		const origin = { cellX: 2, cellY: 1.5 };
		const ext = EXTENT_AT_ORIGIN;
		const result = computeFitScroll(origin, 100, { clientWidth: 1920, clientHeight: 1080 }, ext);
		const expectedScrollLeft =
			INNER_PAD + (origin.cellX - ext.originX) * cellStrideX(100) - GRID_GAP / 2 - 1920 / 2;
		expect(result.scrollLeft).toBeCloseTo(Math.max(0, expectedScrollLeft), 0);
		// MARGIN_CELLS のおかげで widget 中央へ scroll しても left wall (scroll 0) を触らない。
		expect(result.scrollLeft).toBeGreaterThan(0);
	});

	it('viewport が極小でも widget BB を center に置こうとする', () => {
		const origin = { cellX: 5, cellY: 10 };
		const result = computeFitScroll(
			origin,
			100,
			{ clientWidth: 600, clientHeight: 400 },
			EXTENT_AT_ORIGIN,
		);
		expect(result.scrollLeft).toBeGreaterThan(0);
		expect(result.scrollTop).toBeGreaterThan(0);
	});

	it('grid 原点 (0, 0) の widget でも scrollLeft / scrollTop > 0 (壁 回避)', () => {
		const origin = { cellX: 0.5, cellY: 0.5 };
		const result = computeFitScroll(
			origin,
			100,
			{ clientWidth: 1920, clientHeight: 1080 },
			EXTENT_AT_ORIGIN,
		);
		expect(result.scrollLeft).toBeGreaterThan(0);
		expect(result.scrollTop).toBeGreaterThan(0);
	});
});

describe('computeFitZoom', () => {
	it('BB が viewport より小さければ viewport を埋めるよう拡大 (K-8: 100% 縛り撤廃)', () => {
		const bb = { minX: 0, minY: 0, maxX: 2, maxY: 2 };
		// BB 100% pixel: 2*240 + 16 = 496W, 2*135 + 16 = 286H
		// viewport (1920x1080) で十分小さい → 100% 超 (= MAX_ZOOM 200% に飽和の可能性)
		const z = computeFitZoom(bb, { clientWidth: 1920, clientHeight: 1080 });
		expect(z).toBeGreaterThanOrEqual(MIN_ZOOM);
		expect(z).toBeLessThanOrEqual(MAX_ZOOM);
		// K-8: 小 BB は 100% を超えて拡大される
		expect(z).toBeGreaterThan(100);
	});

	it('2026-05-17: 1 widget の Fit は MAX_ZOOM (300%) まで拡大', () => {
		const bb = { minX: 0, minY: 0, maxX: 1, maxY: 1 };
		// BB 120×120 in viewport 1200×800 → ratio min(1168/120, 672/120)
		// = min(9.73, 5.6) = 5.6 → 560% → clamp to MAX_ZOOM (300%)
		const z = computeFitZoom(bb, { clientWidth: 1200, clientHeight: 800 });
		expect(z).toBe(300); // MAX_ZOOM clamp
	});

	it('2 縦 widget の Fit: 上限未満ならそのまま (273%)', () => {
		const bb = { minX: 0, minY: 0, maxX: 1, maxY: 2 };
		// 不具合修正 (2026-05-19): 固定 gap は zoom に追従しないため avail から先に引く。
		// cols=1 rows=2、 availH=672 → cellAvailH=672-16=656 → ratioH=656/240=2.733 → 273%
		const z = computeFitZoom(bb, { clientWidth: 1200, clientHeight: 800 });
		expect(z).toBe(273);
	});

	it('4 widget 2x2 の Fit: 上限未満ならそのまま (273%)', () => {
		const bb = { minX: 0, minY: 0, maxX: 2, maxY: 2 };
		// cols=2 rows=2、 cellAvailW=1168-16=1152 / cellAvailH=672-16=656。
		// ratio min(1152/240, 656/240) = min(4.8, 2.733) = 2.733 → 273%
		const z = computeFitZoom(bb, { clientWidth: 1200, clientHeight: 800 });
		expect(z).toBe(273);
	});

	it('maxZoom 引数で上限を変更できる (user 設定の widgetMaxZoom 用)', () => {
		const bb = { minX: 0, minY: 0, maxX: 1, maxY: 1 };
		// 560% 計算 → maxZoom=200 なら 200、 maxZoom=1000 なら 560。
		expect(computeFitZoom(bb, { clientWidth: 1200, clientHeight: 800 }, 200)).toBe(200);
		expect(computeFitZoom(bb, { clientWidth: 1200, clientHeight: 800 }, 1000)).toBe(560);
	});

	it('BB が viewport より大きければ縮小 (< 100%)', () => {
		// BB 100x100 cells、viewport 800x600 → fit zoom は 100% 未満
		// computeFitZoom は clampZoomFit (MIN=MIN_ZOOM_FIT=5) を使用 (F-8 v3)
		const bb = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
		const z = computeFitZoom(bb, { clientWidth: 800, clientHeight: 600 });
		expect(z).toBeLessThan(100);
		expect(z).toBeGreaterThanOrEqual(MIN_ZOOM_FIT);
	});

	it('不具合修正: zoom<100% の複数 widget BB が実 px で availW/availH に必ず収まる', () => {
		// 旧 computeFitZoom は固定 gap も zoom 倍率で縮む前提だったため、 BB が viewport
		// より大きい (zoom<100%) ケースで実 BB が availW/availH を (cols-1)*gap*(1-ratio)
		// 分 overflow し、 fitToContent が top-left fallback に落ちて中央配置が壊れていた。
		// 複数の cols/rows × viewport で「返した zoom の実 BB px ≤ avail」 を網羅検証する。
		const viewports = [
			{ clientWidth: 1200, clientHeight: 800 },
			{ clientWidth: 1920, clientHeight: 1080 },
			{ clientWidth: 900, clientHeight: 700 },
		];
		const spans = [
			[8, 6],
			[12, 10],
			[20, 14],
			[5, 5],
			[30, 4],
		];
		for (const v of viewports) {
			for (const [cols, rows] of spans) {
				const bb = { minX: 0, minY: 0, maxX: cols, maxY: rows };
				const z = computeFitZoom(bb, v);
				const availW = v.clientWidth - 16 * 2; // SIDE_RESERVE * 2
				const availH = v.clientHeight - 56 - 72; // TOP_RESERVE - BOTTOM_RESERVE
				const bbWidthPx = cols * cellStrideX(z) - GRID_GAP;
				const bbHeightPx = rows * cellStrideY(z) - GRID_GAP;
				// MIN_ZOOM_FIT 飽和時のみ overflow 許容、 それ以外は必ず収まる。
				if (z > MIN_ZOOM_FIT) {
					expect(bbWidthPx).toBeLessThanOrEqual(availW);
					expect(bbHeightPx).toBeLessThanOrEqual(availH);
				}
			}
		}
	});

	it('BB が 0 サイズなら RESET (100)', () => {
		const bb = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
		expect(computeFitZoom(bb, { clientWidth: 1920, clientHeight: 1080 })).toBe(100);
	});
});

describe('computeFitScroll - K-8 multi-widget centering', () => {
	it('1 widget at (0,0): BB center が viewport 幾何中心に来る scroll を返す', () => {
		const origin = { cellX: 0.5, cellY: 0.5 };
		const ext = EXTENT_AT_ORIGIN;
		const result = computeFitScroll(origin, 200, { clientWidth: 1200, clientHeight: 800 }, ext);
		const sx = cellStrideX(200);
		const sy = cellStrideY(200);
		const originPxX = INNER_PAD + (origin.cellX - ext.originX) * sx - GRID_GAP / 2;
		const originPxY = INNER_PAD + (origin.cellY - ext.originY) * sy - GRID_GAP / 2;
		// 不具合修正 (2026-05-19): chrome 補正なしの真の幾何中心 (clientWidth/2, clientHeight/2)。
		expect(result.scrollLeft).toBeCloseTo(Math.max(0, originPxX - 1200 / 2), 0);
		expect(result.scrollTop).toBeCloseTo(Math.max(0, originPxY - 800 / 2), 0);
	});

	it('2 縦 widgets at (0,0)+(0,1): X は 1 widget と同じ center scroll、 Y は下方向にシフト', () => {
		const origin1 = { cellX: 0.5, cellY: 0.5 };
		const origin2 = { cellX: 0.5, cellY: 1.0 };
		const v = { clientWidth: 1200, clientHeight: 800 };
		const r1 = computeFitScroll(origin1, 200, v, EXTENT_AT_ORIGIN);
		const r2 = computeFitScroll(origin2, 200, v, EXTENT_AT_ORIGIN);
		// X scroll は origin.cellX が同じなので同一
		expect(r2.scrollLeft).toBe(r1.scrollLeft);
		// Y scroll は origin.cellY が +0.5 大きいので 0.5 * sy 大きい
		expect(r2.scrollTop - r1.scrollTop).toBeCloseTo(0.5 * cellStrideY(200), 0);
	});

	it('4 widget 2x2: BB center origin (1, 1) が viewport 幾何中心に来る', () => {
		const origin = { cellX: 1, cellY: 1 };
		const ext = EXTENT_AT_ORIGIN;
		const result = computeFitScroll(origin, 200, { clientWidth: 1200, clientHeight: 800 }, ext);
		const sx = cellStrideX(200);
		const originPxX = INNER_PAD + (origin.cellX - ext.originX) * sx - GRID_GAP / 2;
		expect(result.scrollLeft).toBeCloseTo(Math.max(0, originPxX - 1200 / 2), 0);
	});
});

describe('不具合修正: 複数選択 widget の fit-to-content (2026-05-19)', () => {
	// 5 つ散在 widget を選択 → 選択集合の BB → fit zoom → fit scroll の一連を検証。
	const selection = [
		{ position_x: 3, position_y: 2, width: 4, height: 3 },
		{ position_x: 12, position_y: 4, width: 3, height: 2 },
		{ position_x: 7, position_y: 9, width: 2, height: 4 },
		{ position_x: 18, position_y: 1, width: 5, height: 3 },
		{ position_x: 9, position_y: 14, width: 4, height: 2 },
	];
	const viewport = { clientWidth: 1280, clientHeight: 860 };

	it('選択集合の BB は全選択 widget を内包する', () => {
		const bb = computeBoundingBox(selection);
		// minX=3, minY=1, maxX=max(18+5)=23, maxY=max(9+4=13,14+2=16)=16
		expect(bb).toEqual({ minX: 3, minY: 1, maxX: 23, maxY: 16 });
	});

	it('fit zoom で選択 BB が実 px で availW/availH に収まる (top-left fallback に落ちない)', () => {
		const bb = computeBoundingBox(selection);
		if (!bb) throw new Error('bb null');
		const z = computeFitZoom(bb, viewport);
		const availW = viewport.clientWidth - 16 * 2;
		const availH = viewport.clientHeight - 56 - 72;
		const bbWidthPx = (bb.maxX - bb.minX) * cellStrideX(z) - GRID_GAP;
		const bbHeightPx = (bb.maxY - bb.minY) * cellStrideY(z) - GRID_GAP;
		expect(z).toBeGreaterThan(MIN_ZOOM_FIT);
		expect(bbWidthPx).toBeLessThanOrEqual(availW);
		expect(bbHeightPx).toBeLessThanOrEqual(availH);
	});

	it('fit scroll で選択 BB の重心が viewport 幾何中心に一致する', () => {
		const bb = computeBoundingBox(selection);
		if (!bb) throw new Error('bb null');
		const z = computeFitZoom(bb, viewport);
		const origin = computeOrigin(bb);
		const ext = computeRenderExtent(selection);
		const scroll = computeFitScroll(origin, z, viewport, ext);
		// scroll 後の BB 重心 canvas 座標 − scroll = viewport 幾何中心。
		const originPxX = INNER_PAD + (origin.cellX - ext.originX) * cellStrideX(z) - GRID_GAP / 2;
		const originPxY = INNER_PAD + (origin.cellY - ext.originY) * cellStrideY(z) - GRID_GAP / 2;
		expect(originPxX - scroll.scrollLeft).toBeCloseTo(viewport.clientWidth / 2, 0);
		expect(originPxY - scroll.scrollTop).toBeCloseTo(viewport.clientHeight / 2, 0);
	});
});

describe('clampZoom — configurable min/max (2026-05-17)', () => {
	it('引数省略時は default MIN_ZOOM / MAX_ZOOM', () => {
		expect(clampZoom(500)).toBe(MAX_ZOOM); // 300
		expect(clampZoom(0)).toBe(MIN_ZOOM); // 25
	});

	it('user 設定の min / max を渡すとその範囲に clamp', () => {
		expect(clampZoom(900, 10, 1000)).toBe(900);
		expect(clampZoom(1500, 10, 1000)).toBe(1000);
		expect(clampZoom(5, 10, 1000)).toBe(10);
	});
});

describe('clampZoomFit — configurable max (2026-05-17)', () => {
	it('下限は常に MIN_ZOOM_FIT、 上限は引数 (default MAX_ZOOM)', () => {
		expect(clampZoomFit(1)).toBe(MIN_ZOOM_FIT);
		expect(clampZoomFit(9999)).toBe(MAX_ZOOM); // 300
		expect(clampZoomFit(9999, 1000)).toBe(1000);
		expect(clampZoomFit(500, 1000)).toBe(500);
	});
});

describe('effectiveBottomReserve / hint bar fit-to-content (2026-05-17)', () => {
	it('ヒントバー表示時は BOTTOM_RESERVE + HINT_BAR_RESERVE', () => {
		expect(effectiveBottomReserve(true)).toBe(BOTTOM_RESERVE + HINT_BAR_RESERVE);
	});

	it('ヒントバー非表示時は BOTTOM_RESERVE のみ (ヒントバー高さを残さない)', () => {
		expect(effectiveBottomReserve(false)).toBe(BOTTOM_RESERVE);
	});

	it('computeFitZoom: ヒントバー非表示時の方が使える高さが広く zoom は同等以上', () => {
		const bb = { minX: 0, minY: 0, maxX: 6, maxY: 6 };
		const viewport = { clientWidth: 1200, clientHeight: 800 };
		const visible = computeFitZoom(bb, viewport, MAX_ZOOM, effectiveBottomReserve(true));
		const hidden = computeFitZoom(bb, viewport, MAX_ZOOM, effectiveBottomReserve(false));
		expect(hidden).toBeGreaterThanOrEqual(visible);
		// ヒントバー高さ分 availH が違うので zoom 値も実際に変わる (誤計算の検証)。
		expect(hidden).not.toBe(visible);
	});

	it('computeFitScroll: BB 重心は viewport 幾何中心 — ヒントバー state 非依存', () => {
		// 不具合修正 (2026-05-19): 旧 computeFitScroll は bottomReserve 引数で
		// visualCenterY を chrome 補正していたため、 ヒントバー ON/OFF で BB 中心位置が
		// 動いていた。 現在は引数を撤去し常に幾何中心へ — hint bar state に依存しない。
		const origin = { cellX: 5, cellY: 20 };
		const viewport = { clientWidth: 1200, clientHeight: 800 };
		const ext = EXTENT_AT_ORIGIN;
		const sy = cellStrideY(100);
		const originPxY = INNER_PAD + (origin.cellY - ext.originY) * sy - GRID_GAP / 2;
		const result = computeFitScroll(origin, 100, viewport, ext);
		expect(result.scrollTop).toBeCloseTo(Math.max(0, originPxY - 800 / 2), 0);
	});
});
