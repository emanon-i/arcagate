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

/**
 * F-8 v3 (2026-05-09 user 再検収): fit-to-content 専用下限。
 *
 * v2 (=1) は理論上 BB が必ず viewport に収まるが、小さい window だと 2% 等の極端な値に
 * 到達して widget が読めなくなる UX 問題があった。user 期待 range は「多 widget 広域で
 * 5-20%」のため下限を **5** に変更。MIN で BB が overflow する時は scroll を BB top-left
 * align するフォールバックを `fitToContent` 側で復活させる。
 *
 * wheel zoom / reset は今まで通り MIN_ZOOM=25 (操作性担保)。
 */
export const MIN_ZOOM_FIT = 5;

/**
 * 2026-05-07 user 検収: 「左/上の壁が戻った」 regression 対応。
 *
 * 旧 fix (06a1955) は MIN_PAN_COLS=24 / MIN_PAN_ROWS=128 で grid を広く確保し、初期 scroll を
 * BB 重心 viewport 中央に置く戦略だった。しかし widget が row 0 / col 0 付近に配置されると
 * BB 重心 < viewport/2 で scroll が 0 にクランプ、結果 user は左/上の壁を直接触る。
 *
 * 構造 fix: canvas に **buffer 領域 (top/left)** を持たせ、grid origin (0,0) を canvas 内側にオフセット。
 *   - `BUFFER_COLS_LEFT` 列ぶん grid 全体を右に offset
 *   - `BUFFER_ROWS_TOP` 行ぶん grid 全体を下に offset
 *   - canvas size と initial/Fit scroll はこの offset を考慮 (`bufferOffsetPx()` 経由)
 *
 * これで widget が grid (0,0) でも canvas 上は buffer 分だけ右下にあり、user は更に上/左へ pan
 * できる empty 領域を持つ。Obsidian Canvas 等の「無限平面」体験に近づく。
 */
export const BUFFER_COLS_LEFT = 12;
export const BUFFER_ROWS_TOP = 64;

/**
 * chrome reserve (上下左右の toolbar 高さ + 安全マージン)。
 *
 * J-4 (2026-05-12 user 検収): viewport ギリギリまで攻める、隙間必ず確保 (8-16px)。
 * 旧値 (TOP/BOTTOM=80, SIDE=40) は chrome 高さに余裕を持ちすぎ、fit 後 widget が viewport 中央寄り。
 * 新値: 実 chrome 高さ + 約 12px の安全マージンに圧縮、視覚的に viewport ギリギリまで fit。
 *
 * - SIDE_RESERVE = 16 → page padding (p-5 = 20px) と重なるので最小値、実 gap は INNER_PAD + 16 = 36px 程度
 * - TOP_RESERVE = 56 → tab bar 約 44px + 12px safety margin
 * - BOTTOM_RESERVE = 40 → zoom toolbar 約 28px + 12px safety margin
 */
export const TOP_RESERVE = 56;
export const BOTTOM_RESERVE = 40;
export const SIDE_RESERVE = 16;

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

/**
 * fit-to-content 専用 clamp。下限 MIN_ZOOM_FIT (=1)、**上限 RESET_ZOOM (=100)**。
 * 上限 1.0 で「fit は 100% を超えて拡大しない」(Figma / Excalidraw 業界標準)。
 * 下限 1% で BB が巨大な場合でも全 widget が viewport に収まる scale を返せる。
 */
export function clampZoomFit(zoom: number): number {
	return Math.max(MIN_ZOOM_FIT, Math.min(RESET_ZOOM, Math.round(zoom)));
}

/**
 * 2026-05-07 fix: canvas 内側で grid (0, 0) が始まる位置を px で返す (buffer 領域分オフセット)。
 * canvas-size 計算 / initial scroll / Fit scroll / 任意の BB→canvas 変換で共有して使う。
 */
export function bufferOffsetPx(zoom: number): { x: number; y: number } {
	return {
		x: BUFFER_COLS_LEFT * cellStrideX(zoom),
		y: BUFFER_ROWS_TOP * cellStrideY(zoom),
	};
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
	// 2026-05-07: buffer (canvas 上の grid origin offset) も zoom 連動するため、
	// cell 座標を buffer 込み effective cell で扱う (buffer 内の anchor は cellAtAnchor < 0)。
	const sxOld = cellStrideX(oldZoom);
	const syOld = cellStrideY(oldZoom);
	const sxNew = cellStrideX(newZoom);
	const syNew = cellStrideY(newZoom);
	const bufOld = bufferOffsetPx(oldZoom);
	const bufNew = bufferOffsetPx(newZoom);
	const cellAtAnchorX = (viewport.scrollLeft + ax - INNER_PAD - bufOld.x) / sxOld;
	const cellAtAnchorY = (viewport.scrollTop + ay - INNER_PAD - bufOld.y) / syOld;
	const newCanvasX = INNER_PAD + bufNew.x + cellAtAnchorX * sxNew;
	const newCanvasY = INNER_PAD + bufNew.y + cellAtAnchorY * syNew;
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
 *
 * F-8 v2 (2026-05-09 user 検収): 旧実装は `clampZoom` で MIN_ZOOM=25 / MAX_ZOOM=200 にクランプ
 * していたが、user 検収「画面の拡大率変わらない」 root cause は **巨大 BB が MIN_ZOOM 25% でも
 * 入らず scale 飽和 → top-left align fallback に逃げて user 視覚的には fit が機能していない**
 * ように見える状態だった。
 *
 * 修正: `clampZoomFit` で **下限 MIN_ZOOM_FIT=1 / 上限 RESET_ZOOM=100** に変更:
 *   - 下限 1%: BB が幾ら巨大でも必ず収まる scale を返せる (= overflow fallback 不要に)
 *   - 上限 100%: fit は拡大しない (Figma / Excalidraw 業界標準)。1 個だけ widget があるとき
 *     200% に飛ぶと user は混乱する。
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
	return clampZoomFit(Math.floor(ratio * 100));
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
	// 2026-05-07 fix: canvas は buffer (BUFFER_COLS_LEFT × BUFFER_ROWS_TOP) を持つため、
	// grid origin (0, 0) は canvas 内では (INNER_PAD + buffer.x, INNER_PAD + buffer.y) から始まる。
	// origin.cellX / origin.cellY は **grid 座標** なので canvas 座標へ変換時に buffer を加算する。
	const buffer = bufferOffsetPx(zoom);
	// 5/05 Codex H1 fix: BB center px の正確な計算。
	// BB 端 = INNER_PAD + buffer + (minX × stride) 〜 INNER_PAD + buffer + (maxX × stride − gap)
	// → BB center = INNER_PAD + buffer + ((minX + maxX) / 2) × stride − gap/2
	const originPxX = INNER_PAD + buffer.x + origin.cellX * sx - GRID_GAP / 2;
	const originPxY = INNER_PAD + buffer.y + origin.cellY * sy - GRID_GAP / 2;
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
