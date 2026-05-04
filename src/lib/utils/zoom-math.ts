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
 * Zoom 変化時の anchor-preserving scroll 計算 (Reset / Wheel / Button zoom 共通)。
 *
 * 仕様:
 *   - 与えられた `anchor` (viewport-relative px) の canvas 世界点を zoom 変化前後で保つ
 *   - cell サイズが ratio = newZoom / oldZoom 倍になるので、canvas 上の任意の pixel 座標も ratio 倍に動く
 *   - canonical formula: `T1 = Sm − (Sm − T0) × ratio`
 *     ここで T = scroll, Sm = anchor (viewport coord), z0/z1 = oldZoom/newZoom
 *   - viewport-relative coord: `canvasPoint = scroll + anchor` → `newScroll = canvasPoint × ratio − anchor`
 *
 * @param anchor viewport 内の anchor 座標 (`{x, y}` viewport-relative px)。
 *   省略時は viewport center (`{clientWidth/2, clientHeight/2}`) = Reset / Button zoom 用。
 *   Wheel zoom では mouse cursor の viewport-relative 座標を渡す。
 *
 * @returns 新しい scroll 位置 (caller が scrollTo に渡す)。
 *   下限は max(0, ...) で確保、上限は scrollTo の native browser clamp に任せる。
 */
export function computeZoomAnchorScroll(
	oldZoom: number,
	newZoom: number,
	viewport: Pick<Viewport, 'clientWidth' | 'clientHeight' | 'scrollLeft' | 'scrollTop'>,
	anchor?: { x: number; y: number },
): { scrollLeft: number; scrollTop: number } {
	if (oldZoom <= 0) {
		return { scrollLeft: viewport.scrollLeft, scrollTop: viewport.scrollTop };
	}
	const ax = anchor ? anchor.x : viewport.clientWidth / 2;
	const ay = anchor ? anchor.y : viewport.clientHeight / 2;
	// canvas point under anchor (旧 zoom)
	const canvasX = viewport.scrollLeft + ax;
	const canvasY = viewport.scrollTop + ay;
	const ratio = newZoom / oldZoom;
	// canvas point は ratio 倍に拡縮、その点が anchor 位置に来る scroll を解く
	return {
		scrollLeft: Math.max(0, canvasX * ratio - ax),
		scrollTop: Math.max(0, canvasY * ratio - ay),
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
