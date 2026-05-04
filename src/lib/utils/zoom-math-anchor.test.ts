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
	it('places origin at viewport visual center', () => {
		const r = computeFitScroll({ cellX: 5, cellY: 5 }, 100, {
			clientWidth: 1920,
			clientHeight: 1080,
		});
		expect(r.scrollLeft).toBe(340);
		expect(r.scrollTop).toBe(235);
	});
	it('places origin at center for zoom 50', () => {
		const r = computeFitScroll({ cellX: 4, cellY: 4 }, 50, { clientWidth: 800, clientHeight: 600 });
		expect(r.scrollLeft).toBe(164);
		expect(r.scrollTop).toBe(56);
	});
	it('clamps negative scroll to 0', () => {
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
		expect(fitScroll.scrollTop).toBe(230);

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
