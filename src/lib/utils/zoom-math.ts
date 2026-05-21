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

// K-10 part 2 (2026-05-16): 旧 240×135 (16:9 rect) → **120×120 (1:1 square + 半分 finer)**。
// user 報告 K-10:
//   1. 「縦と横の移動量が違う」 → square cell で move/resize step 同一に (両軸 cellStride 136px)
//   2. 「1 段階細かく」 → 旧 BASE_W=240 の半分で 1 段階細かい配置可能
// 既存 widget cell 座標は migration 031_widget_grid_square_finer.sql で
// pixel 視覚位置を概ね preserve するよう scale 済 (x*=2, y*=9/8, w*=2, h*=9/8)。
export const BASE_W = 120;
export const BASE_H = 120;
export const GRID_GAP = 16;
export const INNER_PAD = 20; // p-5 (flex container の padding)
export const MIN_ZOOM = 25;
// 2026-05-17 user 検収: 最大拡大率 default を 200% → 300% に。
// user が Settings で max/min を変更した場合は clampZoom / clampZoomFit に値を渡す
// (本 const は default 兼 fallback)。
export const MAX_ZOOM = 300;
export const RESET_ZOOM = 100;

/** Settings で設定可能な拡大率上限の上下限 (sanity guard、 user 入力 clamp 用)。 */
export const ZOOM_LIMIT_MAX = 1000;
export const ZOOM_LIMIT_MIN = 10;

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
 * 構造 fix: canvas に **buffer 領域 (top/left)** を持たせ、grid origin (0,0) を canvas 内側にオフセット。
 *   - `BUFFER_COLS_LEFT` 列ぶん grid 全体を右に offset
 *   - `BUFFER_ROWS_TOP` 行ぶん grid 全体を下に offset
 *   - canvas size と initial/Fit scroll はこの offset を考慮 (`bufferOffsetPx()` 経由)
 *
 * これで widget が grid (0,0) でも canvas 上は buffer 分だけ右下にあり、user は更に上/左へ pan
 * できる empty 領域を持つ。Obsidian Canvas 等の「無限平面」体験に近づく。
 *
 * 2026-05-19 user 検収 (C 案): buffer を **実用上「無限」相当**まで拡大。 旧 12×64 では
 * widget を少し外へ動かすだけで「壁」を体感したため、 widget 約 50 個分の余白 = 256 cells
 * に拡大する (canvas-size 計算は trailing 側にも同等 buffer を加える、 WorkspaceGrid 参照)。
 * 配置可能範囲のクランプ (≥0) は維持 — buffer は pan 余白であり配置領域そのものではない。
 */
export const BUFFER_COLS_LEFT = 256;
export const BUFFER_ROWS_TOP = 256;

/**
 * chrome reserve (canvas overlay 領域 + 安全マージン)。
 *
 * 2026-05-22 fix: PageTabBar wrapper を canvas に対する **absolute overlay** に変更し、
 * TOP_RESERVE / BOTTOM_RESERVE / HINT_BAR_RESERVE すべてが canvas 内に実際に被さる
 * overlay 領域を表す状態に統一した (旧 wrapper が canvas sibling flex item だった頃は
 * TOP_RESERVE が canvas 内に対応する overlay を持たない "幽霊 reserve" だった)。
 *
 * - SIDE_RESERVE = 16 → page padding (p-5 = 20px) と重なるので最小値、実 gap は INNER_PAD + 16 = 36px 程度
 * - TOP_RESERVE = 56 → PageTabBar pill (canvas 上端 absolute overlay) 実体 約 44px + 12px safety margin
 * - BOTTOM_RESERVE = 72 → floating toolbar (Undo/Redo/Reset/Fit) 実体 56px + 16px safety
 *
 * J-4 (2026-05-12) / K-6 (2026-05-15): viewport ギリギリまで攻めるが、 widget が overlay 裏に
 * 潜らない安全マージン (8-16px) を保つ設計。
 */
export const TOP_RESERVE = 56;
export const BOTTOM_RESERVE = 72;
export const SIDE_RESERVE = 16;

/**
 * 2026-05-17 user 検収: 下部ショートカットヒントバー (undo/redo 等の hotkey hint) の高さ予約。
 *
 * ヒントバー表示時は floating toolbar をこの分だけ上へずらして重なりを回避し、
 * fit-to-content / canvas 高さ計算も `effectiveBottomReserve()` でこの値を加算する。
 * Settings でヒントバーを非表示にした場合はこの予約を外して widget を下端まで配置可能にする。
 */
export const HINT_BAR_RESERVE = 44;

/**
 * ヒントバー表示状態を加味した下部 reserve。
 * 表示時: floating toolbar (BOTTOM_RESERVE) + ヒントバー (HINT_BAR_RESERVE)。
 * 非表示時: floating toolbar のみ。
 */
export function effectiveBottomReserve(hintBarVisible: boolean): number {
	return BOTTOM_RESERVE + (hintBarVisible ? HINT_BAR_RESERVE : 0);
}

/** viewport の `cellPx + gap`（zoom % 込み）。grid 描画と同じ Math.round() を使う。 */
export function cellStrideX(zoomPct: number): number {
	return Math.round(BASE_W * (zoomPct / 100)) + GRID_GAP;
}
export function cellStrideY(zoomPct: number): number {
	return Math.round(BASE_H * (zoomPct / 100)) + GRID_GAP;
}

/**
 * zoom を [min, max] にクランプして整数化。
 * 2026-05-17: min / max は Settings で user が変更可能 (default は MIN_ZOOM / MAX_ZOOM)。
 */
export function clampZoom(zoom: number, min: number = MIN_ZOOM, max: number = MAX_ZOOM): number {
	return Math.max(min, Math.min(max, Math.round(zoom)));
}

/**
 * fit-to-content 専用 clamp。 下限 MIN_ZOOM_FIT、 上限は引数 max (default MAX_ZOOM)。
 *
 * K-8 (2026-05-16 user 検収): 旧上限 RESET_ZOOM (100%) は user 報告
 * 「画面いっぱいにならない」 の root cause。 widget 1 個 / 2 縦 / 4 個 等 BB が
 * 小さいケースで本来 viewport を埋められるはずの拡大率 (例: 235%) が 100% に
 * clamp され、 widget は viewport 中央に小さく配置され buffer 領域が大きく見える
 * 結果 「左に寄る」 視覚錯覚も併発した (BB は数学的に中央配置だが周辺の
 * empty buffer が視覚的優位)。
 *
 * 新上限 = MAX_ZOOM (200%): 小 BB は拡大されて画面いっぱいに近づく。
 *   - 1 widget: 240×135 → viewport 1200×800 で 235% 計算 → 200 (clamp) → 480×270 表示
 *   - 2 縦: 240×286 → 235% → 200 → 480×572 表示
 *   - 4 個 2×2: 496×286 → 235% → 200 → 992×572 表示
 * 大 BB は今まで通り MIN_ZOOM_FIT まで縮小 fallback。
 *
 * Figma / Excalidraw 等の Fit も「viewport を埋めるよう拡大する」 が業界標準で、
 * 「100% 縛り」 は本実装の誤解 (元 v3 v2 comment) だった。
 */
export function clampZoomFit(zoom: number, max: number = MAX_ZOOM): number {
	return Math.max(MIN_ZOOM_FIT, Math.min(max, Math.round(zoom)));
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

/**
 * 2026-05-19 (C 案): 現在 viewport の幾何中心に対応する grid cell 座標を返す。
 *
 * 新規 widget を「位置情報なし」 で追加する経路 (sidebar / toolbar ボタン / keyboard /
 * canvas 外 drop) で、 widget を **現在見えている領域の中央**に置くために使う。
 *
 * canvas pixel の grid cell (0,0) 左上 = `INNER_PAD + bufferOffsetPx`。
 * viewport 中央 canvas pixel = `scroll + client/2`。 cell = (中央 − INNER_PAD − buffer) / stride。
 * 配置可能範囲 `[0, cols) × [0, rows)` に clamp する (grid 端の壁は維持)。
 */
export function computeViewportCenterCell(
	viewport: Pick<Viewport, 'clientWidth' | 'clientHeight' | 'scrollLeft' | 'scrollTop'>,
	zoom: number,
	cols: number,
	rows: number,
): { x: number; y: number } {
	const buf = bufferOffsetPx(zoom);
	const cxPx = viewport.scrollLeft + viewport.clientWidth / 2;
	const cyPx = viewport.scrollTop + viewport.clientHeight / 2;
	const cellX = Math.floor((cxPx - INNER_PAD - buf.x) / cellStrideX(zoom));
	const cellY = Math.floor((cyPx - INNER_PAD - buf.y) / cellStrideY(zoom));
	return {
		x: Math.max(0, Math.min(Math.max(0, cols - 1), cellX)),
		y: Math.max(0, Math.min(Math.max(0, rows - 1), cellY)),
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
 * K-8 (2026-05-16 user 検収): 旧 v3 の **上限 100%** が「画面いっぱいにならない / 左に寄る」
 * の root cause だった。 widget BB が小さい (1 個 / 2 縦 / 4 個 2x2 等) ケースで Fit が viewport
 * を埋めきれず、 周辺の buffer 領域が視覚的に優位になり「左偏り + 小さい」 と知覚されていた。
 *
 * 修正: `clampZoomFit` で **下限 MIN_ZOOM_FIT / 上限 MAX_ZOOM (=200%)** に変更:
 *   - 下限 5% (= MIN_ZOOM_FIT): BB 巨大でも必ず収まる
 *   - 上限 200% (= MAX_ZOOM): 小 BB は viewport を埋めるよう拡大、 業界標準 Figma / Excalidraw
 *     の Fit と一致 (旧 comment「100% 縛り」 は誤解、 実際の Figma は viewport いっぱい拡大する)
 */
export function computeFitZoom(
	bb: BoundingBox,
	viewport: Pick<Viewport, 'clientWidth' | 'clientHeight'>,
	maxZoom: number = MAX_ZOOM,
	bottomReserve: number = BOTTOM_RESERVE,
): number {
	const cols = bb.maxX - bb.minX;
	const rows = bb.maxY - bb.minY;
	if (cols <= 0 || rows <= 0) return RESET_ZOOM;
	const availW = Math.max(1, viewport.clientWidth - SIDE_RESERVE * 2);
	const availH = Math.max(1, viewport.clientHeight - TOP_RESERVE - bottomReserve);
	// 不具合修正 (2026-05-19): GRID_GAP は zoom に追従しない **固定 px**
	// (cellStride = round(BASE × zoom/100) + GRID_GAP)。 旧実装は
	// `bbW100 = cols×BASE + (cols−1)×gap` を 1 つの ratio で一律 scale していたが、
	// それは gap も zoom 倍率で縮む前提の誤りで、 zoom < 100% (BB が viewport より
	// 大きい複数 widget 選択) で実 BB が availW を (cols−1)×gap×(1−ratio) 分 overflow し、
	// fitToContent 側の overflow 判定が top-left align fallback に落ちて「中央に来ない」
	// 不具合になっていた。
	//
	// step 1: 固定 gap 分を avail から先に引き、 cell (BASE) 部分のみを scale 対象とした
	//         ratio で zoom 候補を出す。
	// step 2: cellStride の Math.round() は floor した整数 zoom で理想値を上回り得るため、
	//         実 stride で BB の描画 px を再計測し、 収まるまで整数 zoom を上下調整する
	//         (収まる限り上げ / overflow なら下げ)。 これで「返した zoom の実 BB は必ず
	//         availW/availH に収まる」 (MIN_ZOOM_FIT 飽和時を除く) を保証する。
	const cellAvailW = Math.max(1, availW - Math.max(0, cols - 1) * GRID_GAP);
	const cellAvailH = Math.max(1, availH - Math.max(0, rows - 1) * GRID_GAP);
	const ratio = Math.min(cellAvailW / (cols * BASE_W), cellAvailH / (rows * BASE_H));
	const fits = (z: number): boolean =>
		cols * cellStrideX(z) - GRID_GAP <= availW && rows * cellStrideY(z) - GRID_GAP <= availH;
	let zoom = clampZoomFit(Math.floor(ratio * 100), maxZoom);
	if (fits(zoom)) {
		while (zoom < maxZoom && fits(zoom + 1)) zoom++;
	} else {
		while (zoom > MIN_ZOOM_FIT && !fits(zoom)) zoom--;
	}
	return zoom;
}

/**
 * Fit-to-content の scroll 計算。
 *
 * BB 重心 (origin) を viewport の **visual center** に一致させる scroll 値を返す。
 *
 * visual center は canvas の幾何中心ではなく **canvas overlay (上の PageTabBar pill /
 * 下の floating toolbar / hint bar) を除いた "見える領域" の中央**:
 *   visualCenterY = TOP_RESERVE + (clientHeight − TOP_RESERVE − bottomReserve) / 2
 *   visualCenterX = clientWidth / 2 (左右 overlay は narrow toggle 以外は無いので幾何中心と同じ)
 *
 * 履歴:
 * - 旧 (PR #500 以前): visual center を採用していたが、 PageTabBar が canvas の **sibling**
 *   (flex item) になっていて canvas 内に PageTabBar overlay が無いのに TOP_RESERVE=56 を引いて
 *   いたため、 ヒントバー ON/OFF で BB 中心が動く「不整合 visual center」 になっていた。
 * - PR #516 (2026-05-19): 「ヒントバー ON/OFF で位置が動く」 を防ぐため **幾何中心**に変更
 *   (引数 bottomReserve も撤去)。 ただしこれは「使える領域の中央ではなく canvas の中央に置く」
 *   ことになり、 hint bar / floating toolbar が canvas 下端に overlay する状況で widget 群が
 *   視覚的に下に寄る別の不具合を生んだ。
 * - 2026-05-22 (本 fix): PageTabBar wrapper を canvas に対する **absolute overlay** に
 *   変更し、 TOP_RESERVE / BOTTOM_RESERVE / HINT_BAR_RESERVE すべてが canvas 内の真の
 *   overlay 領域を表す状態を作る。 visual center を **整合性が取れた形で**復活させ、
 *   user 要求の「上タブバー下端 〜 下ツールバー上端の中央」 を満たす。 hint bar ON/OFF で
 *   BB 中心が動くのは正しい挙動 (hint bar が widget を隠す位置に来ないよう少し上にずらす)。
 *
 * scrollWidth/Height は zoom 変化後に reflow されるので、呼び出し側は max(0, ...) のみ適用し、
 * 上限 clamp は browser の native scrollTo に任せる (browser は自動で scrollWidth/Height に clamp する)。
 *
 * @param bottomReserve fitToContent 側で `effectiveBottomReserve(hintBarVisible)` を渡す。
 *   省略時は BOTTOM_RESERVE のみ (hint bar 無視) — 初期 scroll など hint bar 非関連経路向け。
 */
export function computeFitScroll(
	origin: { cellX: number; cellY: number },
	zoom: number,
	viewport: Pick<Viewport, 'clientWidth' | 'clientHeight'>,
	bottomReserve: number = BOTTOM_RESERVE,
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
	// visual center: canvas overlay (PageTabBar pill / floating toolbar / hint bar) を除いた
	// "見える領域" の中央。 左右は overlay が無いので幾何中心と同じ。
	const visualCenterX = viewport.clientWidth / 2;
	const visualCenterY =
		TOP_RESERVE + Math.max(1, viewport.clientHeight - TOP_RESERVE - bottomReserve) / 2;
	return {
		scrollLeft: Math.max(0, originPxX - visualCenterX),
		scrollTop: Math.max(0, originPxY - visualCenterY),
	};
}
