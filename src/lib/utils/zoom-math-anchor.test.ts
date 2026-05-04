import { describe, expect, it } from 'vitest';
import {
	cellStrideX,
	cellStrideY,
	computeFitScroll,
	computeFitZoom,
	computeZoomAnchorScroll,
	INNER_PAD,
	MAX_ZOOM,
	MIN_ZOOM,
	RESET_ZOOM,
} from './zoom-math';

// 5/05 Phase 1.1: cell-coord based ratio (anchor 下の世界 cell coord を zoom 変化で保つ)
//   旧 raw zoom ratio (`newZoom/oldZoom`) は gap=16 fixed のため drift 累積、
//   widget が viewport 外にジャンプする regression があった (Phase 1 PR #282)。
//   新 formula: cellAtAnchor = (scroll + anchor − INNER_PAD) / cellStride(oldZoom)
//              newCanvasPx = INNER_PAD + cellAtAnchor × cellStride(newZoom)
//              T1 = max(0, newCanvasPx − anchor)
//   描画と同じ単位 (cellStride) で計算するため drift = 0。

describe('zoom-math: computeZoomAnchorScroll (anchor = viewport center / Reset zoom)', () => {
	it('keeps anchor cell fixed when zoom doubles (50→100)', () => {
		// viewport 800×600, scroll (200, 100). anchor = viewport center (400, 300)。
		// cellStrideX(50)=136, cellStrideY(50)=84, cellStrideX(100)=256, cellStrideY(100)=151
		// cellAtAnchorX = (200+400-20)/136 = 580/136 ≈ 4.2647
		// newCanvasX = 20 + 4.2647×256 ≈ 1111.76
		// scrollLeft ≈ 711.76
		// cellAtAnchorY = (100+300-20)/84 = 380/84 ≈ 4.5238
		// newCanvasY = 20 + 4.5238×151 ≈ 703.10
		// scrollTop ≈ 403.10
		const r = computeZoomAnchorScroll(50, 100, {
			clientWidth: 800,
			clientHeight: 600,
			scrollLeft: 200,
			scrollTop: 100,
		});
		expect(r.scrollLeft).toBeCloseTo(711.76, 1);
		expect(r.scrollTop).toBeCloseTo(403.1, 1);
	});
	it('shrinks scroll when zoom halves (100→50)', () => {
		// viewport 800×600, scroll (800, 500). anchor = (400, 300)。
		// cellAtAnchorX = (800+400-20)/256 = 1180/256 ≈ 4.6094
		// newCanvasX = 20 + 4.6094×136 ≈ 646.88
		// scrollLeft ≈ 246.88
		// cellAtAnchorY = (500+300-20)/151 = 780/151 ≈ 5.1656
		// newCanvasY = 20 + 5.1656×84 ≈ 453.91
		// scrollTop ≈ 153.91
		const r = computeZoomAnchorScroll(100, 50, {
			clientWidth: 800,
			clientHeight: 600,
			scrollLeft: 800,
			scrollTop: 500,
		});
		expect(r.scrollLeft).toBeCloseTo(246.88, 1);
		expect(r.scrollTop).toBeCloseTo(153.91, 1);
	});
	it('returns identity when zoom unchanged (100→100)', () => {
		// cellStride 不変なので scroll も不変
		const r = computeZoomAnchorScroll(100, 100, {
			clientWidth: 800,
			clientHeight: 600,
			scrollLeft: 200,
			scrollTop: 150,
		});
		expect(r.scrollLeft).toBeCloseTo(200, 5);
		expect(r.scrollTop).toBeCloseTo(150, 5);
	});
	it('clamps negative scroll to 0', () => {
		// 小 scroll + zoom 半減 → newCanvas が anchor より小さくなり負になる、0 クランプ
		// scroll(50, 30), anchor(400, 300), zoom 100→50
		// cellAtAnchorX = (50+400-20)/256 = 430/256 ≈ 1.6797 → newCanvasX ≈ 248.44 → scroll = -151.56 → 0
		const r = computeZoomAnchorScroll(100, 50, {
			clientWidth: 800,
			clientHeight: 600,
			scrollLeft: 50,
			scrollTop: 30,
		});
		expect(r.scrollLeft).toBe(0);
		expect(r.scrollTop).toBe(0);
	});
	it('handles oldZoom=0 gracefully (no-op)', () => {
		const r = computeZoomAnchorScroll(0, 100, {
			clientWidth: 800,
			clientHeight: 600,
			scrollLeft: 200,
			scrollTop: 100,
		});
		expect(r.scrollLeft).toBe(200);
		expect(r.scrollTop).toBe(100);
	});
	// Codex M4 fix: invalid input guard (newZoom 側 + non-finite)
	it('handles invalid input gracefully (no-op for 0 / 負値 / NaN / Infinity)', () => {
		const viewport = { clientWidth: 800, clientHeight: 600, scrollLeft: 200, scrollTop: 100 };
		const expected = { scrollLeft: 200, scrollTop: 100 };
		expect(computeZoomAnchorScroll(100, 0, viewport)).toEqual(expected);
		expect(computeZoomAnchorScroll(100, -50, viewport)).toEqual(expected);
		expect(computeZoomAnchorScroll(100, NaN, viewport)).toEqual(expected);
		expect(computeZoomAnchorScroll(100, Infinity, viewport)).toEqual(expected);
		expect(computeZoomAnchorScroll(NaN, 100, viewport)).toEqual(expected);
	});
});

describe('zoom-math: computeZoomAnchorScroll (anchor = mouse cursor / Wheel zoom)', () => {
	it('cursor at top-left (0, 0) preserves cell at top-left', () => {
		// scroll(200, 100), cursor(0, 0), zoom 100→200
		// cellStrideX(200) = round(480)+16 = 496, cellStrideY(200) = round(270)+16 = 286
		// cellAtAnchorX = (200+0-20)/256 = 180/256 ≈ 0.7031
		// newCanvasX = 20 + 0.7031×496 ≈ 368.75
		// scrollLeft ≈ 368.75
		// cellAtAnchorY = (100+0-20)/151 = 80/151 ≈ 0.5298
		// newCanvasY = 20 + 0.5298×286 ≈ 171.52
		// scrollTop ≈ 171.52
		const r = computeZoomAnchorScroll(
			100,
			200,
			{ clientWidth: 800, clientHeight: 600, scrollLeft: 200, scrollTop: 100 },
			{ x: 0, y: 0 },
		);
		expect(r.scrollLeft).toBeCloseTo(368.75, 1);
		expect(r.scrollTop).toBeCloseTo(171.52, 1);
	});
	it('cursor at viewport center matches default (anchor=undefined)', () => {
		const viewport = { clientWidth: 800, clientHeight: 600, scrollLeft: 200, scrollTop: 100 };
		const withCursor = computeZoomAnchorScroll(100, 200, viewport, { x: 400, y: 300 });
		const withoutAnchor = computeZoomAnchorScroll(100, 200, viewport);
		expect(withCursor).toEqual(withoutAnchor);
	});
	it('cursor at bottom-right (W, H)', () => {
		// scroll(200, 100), cursor(800, 600), zoom 100→200
		// cellAtAnchorX = (200+800-20)/256 = 980/256 ≈ 3.8281
		// newCanvasX = 20 + 3.8281×496 ≈ 1918.75
		// scrollLeft ≈ 1118.75
		// cellAtAnchorY = (100+600-20)/151 = 680/151 ≈ 4.5033
		// newCanvasY = 20 + 4.5033×286 ≈ 1307.95
		// scrollTop ≈ 707.95
		const r = computeZoomAnchorScroll(
			100,
			200,
			{ clientWidth: 800, clientHeight: 600, scrollLeft: 200, scrollTop: 100 },
			{ x: 800, y: 600 },
		);
		expect(r.scrollLeft).toBeCloseTo(1118.75, 1);
		expect(r.scrollTop).toBeCloseTo(707.95, 1);
	});
	it('cursor anchor invariant: zoom 後も cursor 下の世界 cell が同じ', () => {
		// scroll(300, 200), cursor(100, 50), zoom 100→150
		// cellStrideX(150) = round(360)+16 = 376, cellStrideY(150) = round(202.5)+16 = 219
		// cellAtAnchorX = (300+100-20)/256 = 380/256 ≈ 1.4844
		// newCanvasX = 20 + 1.4844×376 ≈ 578.13
		// scrollLeft ≈ 478.13
		// cellAtAnchorY = (200+50-20)/151 = 230/151 ≈ 1.5232
		// newCanvasY = 20 + 1.5232×219 ≈ 353.58
		// scrollTop ≈ 303.58
		const r = computeZoomAnchorScroll(
			100,
			150,
			{ clientWidth: 800, clientHeight: 600, scrollLeft: 300, scrollTop: 200 },
			{ x: 100, y: 50 },
		);
		expect(r.scrollLeft).toBeCloseTo(478.13, 1);
		expect(r.scrollTop).toBeCloseTo(303.58, 1);
	});
});

// 5/05 Phase 1.1: 大 scroll + 大 zoom 変化 で drift がゼロに近いこと (regression 防御 test)
describe('zoom-math: computeZoomAnchorScroll drift verification (Phase 1.1 regression 防御)', () => {
	// helper: anchor 下 cell coord が zoom 変化前後で一致するか検証
	function cellAtAnchor(scroll: number, anchor: number, stride: number): number {
		return (scroll + anchor - INNER_PAD) / stride;
	}

	it('drift = 0 (within 1px) for large scroll Reset 81→100', () => {
		// 旧 raw ratio formula で 234px ジャンプしていたケース (実機 CDP 測定)
		const viewport = { clientWidth: 600, clientHeight: 506, scrollLeft: 1992, scrollTop: 7841 };
		const r = computeZoomAnchorScroll(81, 100, viewport);
		const ax = viewport.clientWidth / 2;
		const ay = viewport.clientHeight / 2;
		const cellBeforeX = cellAtAnchor(viewport.scrollLeft, ax, cellStrideX(81));
		const cellAfterX = cellAtAnchor(r.scrollLeft, ax, cellStrideX(100));
		const cellBeforeY = cellAtAnchor(viewport.scrollTop, ay, cellStrideY(81));
		const cellAfterY = cellAtAnchor(r.scrollTop, ay, cellStrideY(100));
		// cell coord が ±1 cell 以内 (= ~150 px in zoom 100, but cell unit invariant)
		expect(Math.abs(cellAfterX - cellBeforeX)).toBeLessThan(0.05);
		expect(Math.abs(cellAfterY - cellBeforeY)).toBeLessThan(0.05);
	});
	it('drift = 0 for extreme zoom 25→200', () => {
		// 8x zoom 変化で大 drift しがちなケース
		const viewport = { clientWidth: 1920, clientHeight: 1080, scrollLeft: 5000, scrollTop: 3000 };
		const r = computeZoomAnchorScroll(25, 200, viewport);
		const ax = viewport.clientWidth / 2;
		const ay = viewport.clientHeight / 2;
		const cellBeforeX = cellAtAnchor(viewport.scrollLeft, ax, cellStrideX(25));
		const cellAfterX = cellAtAnchor(r.scrollLeft, ax, cellStrideX(200));
		expect(Math.abs(cellAfterX - cellBeforeX)).toBeLessThan(0.05);
		const cellBeforeY = cellAtAnchor(viewport.scrollTop, ay, cellStrideY(25));
		const cellAfterY = cellAtAnchor(r.scrollTop, ay, cellStrideY(200));
		expect(Math.abs(cellAfterY - cellBeforeY)).toBeLessThan(0.05);
	});
	it('drift = 0 for non-5-multiple zoom (51→73, Math.round 偏差ありうる)', () => {
		// cellStride に Math.round がある zoom でも cell-coord 計算が一致する
		const viewport = { clientWidth: 1280, clientHeight: 720, scrollLeft: 2500, scrollTop: 1500 };
		const r = computeZoomAnchorScroll(51, 73, viewport);
		const ax = viewport.clientWidth / 2;
		const ay = viewport.clientHeight / 2;
		const cellBeforeX = cellAtAnchor(viewport.scrollLeft, ax, cellStrideX(51));
		const cellAfterX = cellAtAnchor(r.scrollLeft, ax, cellStrideX(73));
		expect(Math.abs(cellAfterX - cellBeforeX)).toBeLessThan(0.05);
		const cellBeforeY = cellAtAnchor(viewport.scrollTop, ay, cellStrideY(51));
		const cellAfterY = cellAtAnchor(r.scrollTop, ay, cellStrideY(73));
		expect(Math.abs(cellAfterY - cellBeforeY)).toBeLessThan(0.05);
	});
});

describe('zoom-math: computeFitZoom', () => {
	it('returns MAX_ZOOM when BB fits at 200% zoom (small BB)', () => {
		const z = computeFitZoom(
			{ minX: 0, minY: 0, maxX: 2, maxY: 2 },
			{ clientWidth: 1920, clientHeight: 1080 },
		);
		expect(z).toBe(MAX_ZOOM);
	});
	it('shrinks zoom for large BB', () => {
		const z = computeFitZoom(
			{ minX: 0, minY: 0, maxX: 20, maxY: 30 },
			{ clientWidth: 1920, clientHeight: 1080 },
		);
		expect(z).toBe(MIN_ZOOM);
	});
	it('returns floor (not round) — must not overflow viewport', () => {
		const z = computeFitZoom(
			{ minX: 0, minY: 0, maxX: 4, maxY: 1 },
			{ clientWidth: 1920, clientHeight: 1080 },
		);
		expect(z).toBeLessThanOrEqual(MAX_ZOOM);
		expect(z).toBeGreaterThanOrEqual(MIN_ZOOM);
		expect(Number.isInteger(z)).toBe(true);
	});
	it('returns RESET_ZOOM for degenerate BB (cols=0)', () => {
		const z = computeFitZoom(
			{ minX: 5, minY: 0, maxX: 5, maxY: 2 },
			{ clientWidth: 1920, clientHeight: 1080 },
		);
		expect(z).toBe(RESET_ZOOM);
	});
});

describe('zoom-math: computeFitScroll', () => {
	// 5/05 H1 fix 反映: BB center は INNER_PAD + origin.cell × stride − GRID_GAP/2
	it('places origin at viewport visual center (8px bias 撤廃)', () => {
		const r = computeFitScroll({ cellX: 5, cellY: 5 }, 100, {
			clientWidth: 1920,
			clientHeight: 1080,
		});
		expect(r.scrollLeft).toBe(332);
		expect(r.scrollTop).toBe(227);
	});
	it('places origin at center for zoom 50', () => {
		const r = computeFitScroll({ cellX: 4, cellY: 4 }, 50, { clientWidth: 800, clientHeight: 600 });
		expect(r.scrollLeft).toBe(156);
		expect(r.scrollTop).toBe(48);
	});
	it('clamps negative scroll to 0', () => {
		const r = computeFitScroll({ cellX: 0, cellY: 0 }, 100, {
			clientWidth: 1920,
			clientHeight: 1080,
		});
		expect(r.scrollLeft).toBe(0);
		expect(r.scrollTop).toBe(0);
	});
	it('BB center を真の中心に置く (Codex H1 修正検証)', () => {
		const r = computeFitScroll({ cellX: 2, cellY: 1 }, 100, {
			clientWidth: 4000,
			clientHeight: 4000,
		});
		expect(r.scrollLeft).toBe(0);
		expect(r.scrollTop).toBe(0);
		const r2 = computeFitScroll({ cellX: 10, cellY: 10 }, 100, {
			clientWidth: 1920,
			clientHeight: 1080,
		});
		expect(r2.scrollLeft).toBe(1612);
		expect(r2.scrollTop).toBe(982);
	});
});

describe('zoom-math: integration (Fit then Reset)', () => {
	it('Fit followed by Reset returns viewport-center-anchored 100% scroll', () => {
		const fitZoom = computeFitZoom(
			{ minX: 0, minY: 0, maxX: 20, maxY: 30 },
			{ clientWidth: 1920, clientHeight: 1080 },
		);
		expect(fitZoom).toBe(25);
		const fitScroll = computeFitScroll({ cellX: 10, cellY: 15 }, fitZoom, {
			clientWidth: 1920,
			clientHeight: 1080,
		});
		expect(fitScroll.scrollLeft).toBe(0);
		expect(fitScroll.scrollTop).toBe(222);

		// Reset 25→100 (cell-coord based):
		// anchor = vp center (960, 540)。 scroll (0, 222)
		// cellAtAnchorX = (0+960-20)/cellStrideX(25) = 940/76 ≈ 12.368
		// newCanvasX = 20 + 12.368×256 ≈ 3186.32
		// scrollLeft ≈ 2226.32
		// cellAtAnchorY = (222+540-20)/cellStrideY(25) = 742/50 = 14.84
		// newCanvasY = 20 + 14.84×151 = 2260.84
		// scrollTop ≈ 1720.84
		const resetScroll = computeZoomAnchorScroll(25, 100, {
			clientWidth: 1920,
			clientHeight: 1080,
			scrollLeft: fitScroll.scrollLeft,
			scrollTop: fitScroll.scrollTop,
		});
		expect(resetScroll.scrollLeft).toBeCloseTo(2226.32, 1);
		expect(resetScroll.scrollTop).toBeCloseTo(1720.84, 1);
	});
});
