import { describe, expect, it } from 'vitest';
import {
	computeFitScroll,
	computeFitZoom,
	computeZoomAnchorScroll,
	MAX_ZOOM,
	MIN_ZOOM,
	RESET_ZOOM,
} from './zoom-math';

describe('zoom-math: computeZoomAnchorScroll (anchor = viewport center / Reset zoom)', () => {
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
});

describe('zoom-math: computeZoomAnchorScroll (anchor = mouse cursor / Wheel zoom)', () => {
	// viewport 800×600, scroll (200, 100). Zoom 100 → 200 (ratio 2).
	// 任意 anchor (ax, ay) で canvas point = scroll + anchor。
	// new scroll = canvasPoint × 2 − anchor = 2*(scroll+anchor) − anchor = 2*scroll + anchor

	it('cursor at top-left (0, 0): canvas top-left stays at top-left', () => {
		// canvasPoint = (200, 100). new scroll = (400, 200) - (0, 0) = (400, 200)
		const r = computeZoomAnchorScroll(
			100,
			200,
			{ clientWidth: 800, clientHeight: 600, scrollLeft: 200, scrollTop: 100 },
			{ x: 0, y: 0 },
		);
		expect(r.scrollLeft).toBe(400);
		expect(r.scrollTop).toBe(200);
	});
	it('cursor at viewport center matches default (anchor=undefined)', () => {
		const viewport = { clientWidth: 800, clientHeight: 600, scrollLeft: 200, scrollTop: 100 };
		const withCursor = computeZoomAnchorScroll(100, 200, viewport, { x: 400, y: 300 });
		const withoutAnchor = computeZoomAnchorScroll(100, 200, viewport);
		expect(withCursor).toEqual(withoutAnchor);
	});
	it('cursor at bottom-right (W, H)', () => {
		// anchor = (800, 600). canvasPoint = (1000, 700).
		// new scroll = (2000, 1400) - (800, 600) = (1200, 800)
		const r = computeZoomAnchorScroll(
			100,
			200,
			{ clientWidth: 800, clientHeight: 600, scrollLeft: 200, scrollTop: 100 },
			{ x: 800, y: 600 },
		);
		expect(r.scrollLeft).toBe(1200);
		expect(r.scrollTop).toBe(800);
	});
	it('cursor anchor 不変点: zoom 後も cursor 下の世界点が同じ pixel に居る', () => {
		// 旧 zoom 100, scroll (300, 200), cursor (100, 50)
		// canvasPoint at cursor (旧) = (400, 250)
		const oldZoom = 100;
		const newZoom = 150;
		const cursor = { x: 100, y: 50 };
		const r = computeZoomAnchorScroll(
			oldZoom,
			newZoom,
			{ clientWidth: 800, clientHeight: 600, scrollLeft: 300, scrollTop: 200 },
			cursor,
		);
		// 新 zoom で cursor 下の世界点は (canvasPoint × ratio) = (600, 375)
		// この点が cursor (100, 50) に来る → scroll = (600-100, 375-50) = (500, 325)
		expect(r.scrollLeft).toBe(500);
		expect(r.scrollTop).toBe(325);
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
	// 5/05 H1 fix 反映: BB center px = INNER_PAD + origin.cell × stride − GRID_GAP/2
	// 旧 8px bias は撤廃済 (Codex H1 検出 + 修正)
	it('places origin at viewport visual center (8px bias 撤廃)', () => {
		// origin (5, 5), zoom 100 → cellW=256, cellH=151
		// originPx = (20 + 5*256 − 8, 20 + 5*151 − 8) = (1292, 767)
		// visual center: x=960, y=80+(1080-160)/2=540
		// scroll = (1292-960, 767-540) = (332, 227)
		const r = computeFitScroll({ cellX: 5, cellY: 5 }, 100, {
			clientWidth: 1920,
			clientHeight: 1080,
		});
		expect(r.scrollLeft).toBe(332);
		expect(r.scrollTop).toBe(227);
	});
	it('places origin at center for zoom 50', () => {
		// origin (4, 4), zoom 50 → cellW=136, cellH=84
		// originPx = (20 + 4*136 − 8, 20 + 4*84 − 8) = (556, 348)
		// visual center: 400, 300
		// scroll = (556-400, 348-300) = (156, 48)
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
	// 5/05 Codex H1 検出 + Phase 1 で対処: BB center 計算が真の center に一致することを直接検証。
	// 旧実装は origin.cellX × stride で計算していたが、これは BB end が widgetW px 先行で
	// GRID_GAP/2 = 8px の系統的 bias が乗っていた。修正後は真の BB center に合致。
	it('BB center を真の中心に置く (Codex H1 修正検証)', () => {
		// BB span cols=4 rows=2 (整数 origin)。origin = ((0+4)/2, (0+2)/2) = (2, 1)。
		// 真の BB px range (zoom 100):
		//   start_x = INNER_PAD = 20
		//   end_x   = 20 + 4*240 + 3*16 = 1028  (4 cells × widgetW + 3 gap)
		//   true center_x = (20 + 1028) / 2 = 524
		// 公式 (修正後): 20 + 2*256 − 8 = 524 ✓ (旧公式: 20 + 2*256 = 532 で 8px bias)
		//   start_y = 20, end_y = 20 + 2*135 + 1*16 = 306
		//   true center_y = (20 + 306) / 2 = 163
		// 公式: 20 + 1*151 − 8 = 163 ✓
		// viewport を BB を完全に内包する大きさにして scroll が origin px と直結することを確認。
		const r = computeFitScroll({ cellX: 2, cellY: 1 }, 100, {
			clientWidth: 4000,
			clientHeight: 4000,
		});
		// originPxX=524 < visualCenterX=2000 で max(0, 524-2000) = 0 にクランプされる。
		// originPxY=163 < visualCenterY=80+(4000-160)/2=2000 で同じく 0。
		// → 公式が真の center を返している証跡として、別途 visual center を超えるケースを併用検証。
		expect(r.scrollLeft).toBe(0);
		expect(r.scrollTop).toBe(0);

		// visualCenter 越えの origin で公式と真の center の一致を確認
		// origin (10, 10), viewport 1920x1080: visualCenterX=960, visualCenterY=540
		// originPxX = 20 + 10*256 − 8 = 2572
		// originPxY = 20 + 10*151 − 8 = 1522
		// scroll = (2572 - 960, 1522 - 540) = (1612, 982)
		const r2 = computeFitScroll({ cellX: 10, cellY: 10 }, 100, {
			clientWidth: 1920,
			clientHeight: 1080,
		});
		expect(r2.scrollLeft).toBe(1612);
		expect(r2.scrollTop).toBe(982);
	});
});

describe('zoom-math: integration (Fit then Reset)', () => {
	it('Fit followed by Reset returns to viewport-center anchor at 100%', () => {
		const fitZoom = computeFitZoom(
			{ minX: 0, minY: 0, maxX: 20, maxY: 30 },
			{ clientWidth: 1920, clientHeight: 1080 },
		);
		expect(fitZoom).toBe(25);
		// origin (10, 15), zoom 25 → cellW=76, cellH=50
		// originPx = (20 + 10*76 − 8, 20 + 15*50 − 8) = (772, 762)
		// visual center: x=960, y=540
		// scroll = max(0, 772-960=-188) = 0, max(0, 762-540) = 222
		const fitScroll = computeFitScroll({ cellX: 10, cellY: 15 }, fitZoom, {
			clientWidth: 1920,
			clientHeight: 1080,
		});
		expect(fitScroll.scrollLeft).toBe(0);
		expect(fitScroll.scrollTop).toBe(222);

		// Reset 25→100: anchor = viewport center (clientWidth/2, clientHeight/2)
		// canvasPoint = (0+960, 222+540) = (960, 762), ratio = 4
		// newCanvasPoint = (3840, 3048), newScroll = (3840-960, 3048-540) = (2880, 2508)
		const resetScroll = computeZoomAnchorScroll(25, 100, {
			clientWidth: 1920,
			clientHeight: 1080,
			scrollLeft: fitScroll.scrollLeft,
			scrollTop: fitScroll.scrollTop,
		});
		expect(resetScroll.scrollLeft).toBe(2880);
		expect(resetScroll.scrollTop).toBe(2508);
	});
});
