/**
 * Workspace zoom + scroll の純粋関数群。
 *
 * 5/04 user 検収 (post-redo3 #7) 抜本書き直し対応:
 *   1. **Reset zoom = viewport-center anchor**：
 *      画面中央の canvas pixel point を保ったまま zoom 倍率だけ変える。
 *      cell サイズが ratio = newZoom/oldZoom で拡大縮小するので、scroll を ratio 倍に補正。
 *      旧実装は scroll 不変のため zoom 変化で widget が画面外に飛ぶバグ。
 *
 *   2. **Fit = BB 重心 (= 原点) を viewport 中央に**：
 *      全 widget の bounding box 重心を計算 → zoom を BB が available area に収まる比率に → BB 重心が
 *      viewport 中央に来るよう scroll。
 *
 * 数値検証可能な pure function に分離して widget-zoom.svelte.ts から呼ぶ。
 */

export const BASE_W = 240;
export const BASE_H = 135;
export const GRID_GAP = 16;
export const INNER_PAD = 20; // p-5 (flex container の padding)
export const MIN_ZOOM = 25;
export const MAX_ZOOM = 200;
export const RESET_ZOOM = 100;

/** chrome reserve (上下左右の toolbar 高さ) */
export const TOP_RESERVE = 80;
export const BOTTOM_RESERVE = 80;
export const SIDE_RESERVE = 40;

/** viewport の `cellPx + gap`（zoom % 込み）。grid 描画と同じ Math.round() を使う。 */
export function cellStrideX(zoomPct: number): number {
	return Math.round(BASE_W * (zoomPct / 100)) + GRID_GAP;
}
export function cellStrideY(zoomPct: number): number {
	return Math.round(BASE_H * (zoomPct / 100)) + GRID_GAP;
}

/** zoom を [MIN_ZOOM, MAX_ZOOM] にクランプして整数化。 */
export function clampZoom(zoom: number): number {
	return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(zoom)));
}

export interface Viewport {
	clientWidth: number;
	clientHeight: number;
	scrollLeft: number;
	scrollTop: number;
	scrollWidth: number;
	scrollHeight: number;
}

/**
 * Reset zoom (viewport-center anchor)。
 *
 * 仕様:
 *   - viewport 中央の canvas pixel point は zoom 変化前後で「同じ視覚位置」を保つ
 *   - cell サイズが ratio = newZoom / oldZoom 倍になるので、canvas 上の任意の pixel 座標も ratio 倍に動く
 *   - 新 scrollLeft = (旧 viewport center 座標) × ratio − clientWidth/2
 *
 * @returns 新しい scroll 位置 (clamp 前)。caller が scrollTo に使う前に scrollWidth/Height で clamp する想定。
 *   ただし zoom 変化後の scrollWidth/Height は事前に計算困難 (DOM reflow 待ちが必要) のため、
 *   呼び出し側は requestAnimationFrame 経由で scrollTo + max(0, ...) で下限のみ確保する。
 */
export function computeZoomAnchorScroll(
	oldZoom: number,
	newZoom: number,
	viewport: Pick<Viewport, 'clientWidth' | 'clientHeight' | 'scrollLeft' | 'scrollTop'>,
): { scrollLeft: number; scrollTop: number } {
	if (oldZoom <= 0) {
		return { scrollLeft: viewport.scrollLeft, scrollTop: viewport.scrollTop };
	}
	const centerX = viewport.scrollLeft + viewport.clientWidth / 2;
	const centerY = viewport.scrollTop + viewport.clientHeight / 2;
	const ratio = newZoom / oldZoom;
	return {
		scrollLeft: Math.max(0, centerX * ratio - viewport.clientWidth / 2),
		scrollTop: Math.max(0, centerY * ratio - viewport.clientHeight / 2),
	};
}

export interface BoundingBox {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

export interface Widget {
	position_x: number;
	position_y: number;
	width: number;
	height: number;
}

/** widget 群から BB を計算。空配列なら null。 */
export function computeBoundingBox(widgets: Widget[]): BoundingBox | null {
	if (widgets.length === 0) return null;
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const w of widgets) {
		minX = Math.min(minX, w.position_x);
		minY = Math.min(minY, w.position_y);
		maxX = Math.max(maxX, w.position_x + w.width);
		maxY = Math.max(maxY, w.position_y + w.height);
	}
	if (maxX <= minX || maxY <= minY) return null;
	return { minX, minY, maxX, maxY };
}

/** BB 重心 (= 原点 origin)。cell 単位の小数。 */
export function computeOrigin(bb: BoundingBox): { cellX: number; cellY: number } {
	return {
		cellX: (bb.minX + bb.maxX) / 2,
		cellY: (bb.minY + bb.maxY) / 2,
	};
}

/**
 * Fit-to-content の zoom 計算。
 *
 * BB が available area (viewport から chrome reserve を引いた領域) に納まる最大 zoom を返す。
 * BASE 単位 (zoom 100% 時) の cell pixel を使って ratio を出すので零点合わせ済。
 */
export function computeFitZoom(
	bb: BoundingBox,
	viewport: Pick<Viewport, 'clientWidth' | 'clientHeight'>,
): number {
	const cols = bb.maxX - bb.minX;
	const rows = bb.maxY - bb.minY;
	const availW = Math.max(1, viewport.clientWidth - SIDE_RESERVE * 2);
	const availH = Math.max(1, viewport.clientHeight - TOP_RESERVE - BOTTOM_RESERVE);
	// BB の 100% zoom 時 pixel 幅: cols × BASE_W + (cols−1) × gap
	const bbW100 = cols * BASE_W + Math.max(0, cols - 1) * GRID_GAP;
	const bbH100 = rows * BASE_H + Math.max(0, rows - 1) * GRID_GAP;
	if (bbW100 <= 0 || bbH100 <= 0) return RESET_ZOOM;
	const ratio = Math.min(availW / bbW100, availH / bbH100);
	// floor で「BB が必ず収まる」を保証 (round / ceil だと境界で 1px overflow が起きる)
	return clampZoom(Math.floor(ratio * 100));
}

/**
 * Fit-to-content の scroll 計算。
 *
 * BB 重心 (origin) を viewport の **visual center** (chrome 補正済) に持ってくる scroll 値を返す。
 * scrollWidth/Height は zoom 変化後に reflow されるので、呼び出し側は max(0, ...) のみ適用し、
 * 上限 clamp は browser の native scrollTo に任せる (browser は自動で scrollWidth/Height に clamp する)。
 */
export function computeFitScroll(
	origin: { cellX: number; cellY: number },
	zoom: number,
	viewport: Pick<Viewport, 'clientWidth' | 'clientHeight'>,
): { scrollLeft: number; scrollTop: number } {
	const sx = cellStrideX(zoom);
	const sy = cellStrideY(zoom);
	// origin の pixel 座標 (canvas 原点起点): INNER_PAD + origin.cell × stride
	const originPxX = INNER_PAD + origin.cellX * sx;
	const originPxY = INNER_PAD + origin.cellY * sy;
	// visual center: chrome reserve を考慮した available area の中央
	// X: 単純な viewport 中央 (左右 reserve は対称なので center は不変)
	// Y: TOP_RESERVE 〜 (clientHeight - BOTTOM_RESERVE) の中央
	const visualCenterX = viewport.clientWidth / 2;
	const visualCenterY = TOP_RESERVE + (viewport.clientHeight - TOP_RESERVE - BOTTOM_RESERVE) / 2;
	return {
		scrollLeft: Math.max(0, originPxX - visualCenterX),
		scrollTop: Math.max(0, originPxY - visualCenterY),
	};
}
