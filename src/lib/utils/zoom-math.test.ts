import { describe, expect, it } from 'vitest';
import {
	BASE_H,
	BASE_W,
	cellStrideX,
	cellStrideY,
	clampZoom,
	computeBoundingBox,
	computeFitScroll,
	computeFitZoom,
	computeOrigin,
	computeZoomAnchorScroll,
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

describe('zoom-math: computeZoomAnchorScroll (Reset zoom)', () => {
	it('keeps viewport center fixed when zoom doubles', () => {
		// viewport 800×600, scroll (200, 100). Center at canvas px (600, 400).
		// Zoom 50 → 100 (ratio 2). New center should be at (1200, 800) in canvas px.
		// New scroll = (1200 - 400, 800 - 300) = (800, 500).
		const r = computeZoomAnchorScroll(50, 100, {
			clientWidth: 800,
			clientHeight: 600,
			scrollLeft: 200,
			scrollTop: 100,
		});
		expect(r.scrollLeft).toBe(800);
		expect(r.scrollTop).toBe(500);
	});
	it('shrinks scroll when zoom halves', () => {
		// scroll (800, 500), zoom 100 → 50 (ratio 0.5)
		// canvas point at center (1200, 800) → at zoom 50 = (600, 400)
		// new scroll = (600 - 400, 400 - 300) = (200, 100)
		const r = computeZoomAnchorScroll(100, 50, {
			clientWidth: 800,
			clientHeight: 600,
			scrollLeft: 800,
			scrollTop: 500,
		});
		expect(r.scrollLeft).toBe(200);
		expect(r.scrollTop).toBe(100);
	});
	it('returns identity when zoom unchanged', () => {
		const r = computeZoomAnchorScroll(100, 100, {
			clientWidth: 800,
			clientHeight: 600,
			scrollLeft: 200,
			scrollTop: 150,
		});
		expect(r.scrollLeft).toBe(200);
		expect(r.scrollTop).toBe(150);
	});
	it('clamps negative scroll to 0', () => {
		// Tiny scroll, zoom shrinks: result might be negative
		const r = computeZoomAnchorScroll(100, 50, {
			clientWidth: 800,
			clientHeight: 600,
			scrollLeft: 50,
			scrollTop: 30,
		});
		// center (450, 330), at zoom 50 = (225, 165). new scroll = (-175, -135) → clamped to 0
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
});

describe('zoom-math: computeFitZoom', () => {
	it('returns 100 when BB exactly fits at 100% zoom', () => {
		// BB cols=2 → bbW100 = 2*240 + 1*16 = 496. availW for 100% = 1920-80=1840
		// BB rows=2 → bbH100 = 2*135 + 1*16 = 286. availH = 1080-160=920
		// ratio = min(1840/496, 920/286) = min(3.71, 3.22) = 3.22 → floor*100 = 322 → clamped to 200
		const z = computeFitZoom(
			{ minX: 0, minY: 0, maxX: 2, maxY: 2 },
			{ clientWidth: 1920, clientHeight: 1080 },
		);
		expect(z).toBe(MAX_ZOOM);
	});
	it('shrinks zoom for large BB', () => {
		// BB cols=20 rows=30: bbW100 = 20*240 + 19*16 = 5104, bbH100 = 30*135 + 29*16 = 4514
		// availW=1840, availH=920
		// ratio = min(0.36, 0.20) = 0.20 → floor*100 = 20 → clamped to 25
		const z = computeFitZoom(
			{ minX: 0, minY: 0, maxX: 20, maxY: 30 },
			{ clientWidth: 1920, clientHeight: 1080 },
		);
		expect(z).toBe(MIN_ZOOM);
	});
	it('returns floor (not round) — must not overflow viewport', () => {
		// BB span chosen so ratio just under integer:
		// bbW100=1000 → ratio = 1840/1000 = 1.84 → floor*100=184 (zoom 184%)
		// bbH100=500 → ratio = 920/500 = 1.84 → matches → zoom 184
		// Both axes give 1.84, ratio=1.84, *100=184, floor=184
		// Construct: cols × 240 + (cols-1)*16 = 1000 → cols=4: 960+48=1008 (close but off)
		// Use cols=4: bbW100 = 1008. ratio=1840/1008=1.825... → 182
		const z = computeFitZoom(
			{ minX: 0, minY: 0, maxX: 4, maxY: 1 },
			{ clientWidth: 1920, clientHeight: 1080 },
		);
		expect(z).toBeLessThanOrEqual(MAX_ZOOM);
		expect(z).toBeGreaterThanOrEqual(MIN_ZOOM);
		// zoom is integer
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
	it('places origin at viewport visual center', () => {
		// origin at cell (5, 5), zoom 100 → cellW = 256, cellH = 151
		// origin px = (20 + 5*256, 20 + 5*151) = (1300, 775)
		// visual center: x = 1920/2 = 960, y = 80 + (1080-160)/2 = 80 + 460 = 540
		// scroll = (1300-960, 775-540) = (340, 235)
		const r = computeFitScroll({ cellX: 5, cellY: 5 }, 100, {
			clientWidth: 1920,
			clientHeight: 1080,
		});
		expect(r.scrollLeft).toBe(340);
		expect(r.scrollTop).toBe(235);
	});
	it('places origin at center for zoom 50', () => {
		// origin at cell (4, 4), zoom 50 → cellW = round(120)+16=136, cellH = round(67.5)+16 = 68+16 = 84
		// Note: Math.round half-to-even or half-up? In JS Math.round(67.5)=68 (rounds half-up)
		// origin px = (20 + 4*136, 20 + 4*84) = (564, 356)
		// viewport 800×600, visual center x=400, y=80+(600-160)/2=80+220=300
		// scroll = (564-400, 356-300) = (164, 56)
		const r = computeFitScroll({ cellX: 4, cellY: 4 }, 50, { clientWidth: 800, clientHeight: 600 });
		expect(r.scrollLeft).toBe(164);
		expect(r.scrollTop).toBe(56);
	});
	it('clamps negative scroll to 0', () => {
		// origin at (0, 0), so px ≈ INNER_PAD=20. visual center 960×540 → scroll (20-960, 20-540) = negative
		const r = computeFitScroll({ cellX: 0, cellY: 0 }, 100, {
			clientWidth: 1920,
			clientHeight: 1080,
		});
		expect(r.scrollLeft).toBe(0);
		expect(r.scrollTop).toBe(0);
	});
});

describe('zoom-math: integration (Fit then Reset)', () => {
	it('Fit followed by Reset returns to viewport-center anchor at 100%', () => {
		// 1) start: zoom=100, scroll=(0,0), viewport 1920×1080
		// 2) widgets BB cols=20 rows=30 → Fit zoom=25 (clamp), scroll = origin*stride - center
		//    origin = (10, 15) in cells
		//    cellW at 25 = round(60)+16 = 76, cellH = round(33.75)+16 = 34+16 = 50
		//    origin px = (20 + 10*76, 20 + 15*50) = (780, 770)
		//    visual center = (960, 540) (TOP_RESERVE 80 + (1080-160)/2 = 540)
		//    scroll = (780-960, 770-540) = (-180, 230) → clamp to (0, 230)
		const fitZoom = computeFitZoom(
			{ minX: 0, minY: 0, maxX: 20, maxY: 30 },
			{ clientWidth: 1920, clientHeight: 1080 },
		);
		expect(fitZoom).toBe(25);
		const fitScroll = computeFitScroll({ cellX: 10, cellY: 15 }, fitZoom, {
			clientWidth: 1920,
			clientHeight: 1080,
		});
		expect(fitScroll.scrollLeft).toBe(0); // clamped
		expect(fitScroll.scrollTop).toBe(230);

		// 3) Reset zoom from 25 to 100 (anchor at viewport center)
		// center at fitScroll = (0+960, 230+540) = (960, 770)
		// ratio = 100/25 = 4
		// new center (3840, 3080) → scroll (3840-960, 3080-540) = (2880, 2540)
		const resetScroll = computeZoomAnchorScroll(25, 100, {
			clientWidth: 1920,
			clientHeight: 1080,
			scrollLeft: fitScroll.scrollLeft,
			scrollTop: fitScroll.scrollTop,
		});
		expect(resetScroll.scrollLeft).toBe(2880);
		expect(resetScroll.scrollTop).toBe(2540);
	});
});

// ensure constants are stable contracts
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
