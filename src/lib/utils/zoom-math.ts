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
 * 仕様 (5/05 Phase 1.1: cell-coord based):
 *   - 与えられた `anchor` (viewport-relative px) の canvas 世界点を zoom 変化前後で保つ
 *   - canvas 拡縮は **cell stride** ベース (描画と同じ) ＝ `Math.round(BASE × zoom/100) + GRID_GAP`
 *   - INNER_PAD (20px) は scale されない fixed offset として別扱い
 *
 * 旧 raw zoom ratio (`newZoom / oldZoom`) は canvas 全体一律拡縮 前提だったが、
 * gap=16 / INNER_PAD=20 が fixed なので zoom 変化が大きいと drift が累積し、
 * widget が viewport 外へジャンプする bug があった (Phase 1 regression、Codex M3 関連)。
 *
 * 新 formula:
 *   cellAtAnchorX = (T0.x + ax − INNER_PAD) / cellStrideX(oldZoom)
 *   cellAtAnchorY = (T0.y + ay − INNER_PAD) / cellStrideY(oldZoom)
 *   newCanvasX = INNER_PAD + cellAtAnchorX × cellStrideX(newZoom)
 *   newCanvasY = INNER_PAD + cellAtAnchorY × cellStrideY(newZoom)
 *   T1 = max(0, newCanvasX − ax), max(0, newCanvasY − ay)
 *
 * これで描画と同じ単位で計算するため drift = 0 (Math.round の sub-px 偏差を除く)。
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
	// 5/05 Codex M4 fix: newZoom 側の non-finite / 0 / 負値も guard。
	// caller は通常 clampZoom() 経由で [25, 200] の正整数を渡すが、外部からの直 call にも
	// 防御 (defensive)。invalid input なら現 scroll をそのまま返す = no-op。
	if (!Number.isFinite(oldZoom) || !Number.isFinite(newZoom) || oldZoom <= 0 || newZoom <= 0) {
		return { scrollLeft: viewport.scrollLeft, scrollTop: viewport.scrollTop };
	}
	// 5/05 Codex (Phase 1.1) M1 fix: anchor を内部 clamp (defense in depth)。
	// caller (widget-zoom handleWheel) も `clampAnchor` 経由で渡すが、外部直 call や
	// `Math.NaN` 等が来た時に out-of-viewport anchor で大 jump するのを防ぐ。
	// viewport center default はそもそも range 内なので clamp 効果なし、no-op。
	const { x: ax, y: ay } = anchor
		? clampAnchor(anchor, viewport)
		: { x: viewport.clientWidth / 2, y: viewport.clientHeight / 2 };
	// 5/05 Phase 1.1: cell-coord based ratio。
	// anchor 下の canvas point を「どの cell の何分の位置か」 で表現 (oldZoom 基準)、
	// 新 zoom の cell stride で px に再変換。INNER_PAD は scale 対象外なので別扱い。
	// boundary 注: scrollLeft + ax < INNER_PAD で cellAtAnchor が負になった場合、
	// 結果 scroll が `Math.max(0, ...)` で 0 にクランプされる。これは canvas top-left
	// 境界で anchor 厳密保存ができない既知の振る舞い (Codex L2)。
	const sxOld = cellStrideX(oldZoom);
	const syOld = cellStrideY(oldZoom);
	const sxNew = cellStrideX(newZoom);
	const syNew = cellStrideY(newZoom);
	const cellAtAnchorX = (viewport.scrollLeft + ax - INNER_PAD) / sxOld;
	const cellAtAnchorY = (viewport.scrollTop + ay - INNER_PAD) / syOld;
	const newCanvasX = INNER_PAD + cellAtAnchorX * sxNew;
	const newCanvasY = INNER_PAD + cellAtAnchorY * syNew;
	return {
		scrollLeft: Math.max(0, newCanvasX - ax),
		scrollTop: Math.max(0, newCanvasY - ay),
	};
}

/**
 * 5/05 Codex L5 fix: cursor anchor を container bounds に clamp する pure 関数。
 *
 * Wheel zoom 時、`e.clientX - rect.left` は通常 `[0, clientWidth]` 範囲だが、
 * momentum wheel / transformed layout / iframe / DPR 不整合などで viewport 外
 * (負値 / clientWidth 超) になり得る。invalid anchor で zoom すると scroll が
 * 急 jump する edge case が発生する。
 *
 * `[0, clientWidth] × [0, clientHeight]` に clamp して安全な anchor を保証。
 */
export function clampAnchor(
	anchor: { x: number; y: number },
	viewport: Pick<Viewport, 'clientWidth' | 'clientHeight'>,
): { x: number; y: number } {
	return {
		x: Math.max(0, Math.min(viewport.clientWidth, anchor.x)),
		y: Math.max(0, Math.min(viewport.clientHeight, anchor.y)),
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
	// 5/05 Codex H1 fix: BB center px の正確な計算。
	// BB 端 = INNER_PAD + (minX × stride) 〜 INNER_PAD + (maxX × stride − gap)
	//   (最後のセルは widgetW px、後続 gap なし)
	// → BB center = INNER_PAD + ((minX + maxX) / 2) × stride − gap/2
	//             = INNER_PAD + origin.cellX × stride − GRID_GAP / 2
	// 旧実装は GRID_GAP/2 = 8px の系統的 bias で BB が右下に 8px ずれていた。
	const originPxX = INNER_PAD + origin.cellX * sx - GRID_GAP / 2;
	const originPxY = INNER_PAD + origin.cellY * sy - GRID_GAP / 2;
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
