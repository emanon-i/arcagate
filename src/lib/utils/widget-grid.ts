/**
 * Widget grid utilities — overlap 検出 / 空きスペース探索。
 *
 * 引用元 guideline:
 * - docs/desktop_ui_ux_agent_rules.md P1 (状態) / P2 (失敗前提)
 * - docs/l1_requirements/ux_standards.md §13 (Workspace Canvas: widget 同士は重ならない)
 * - docs/l0_ideas/arcagate-engineering-principles.md §3 (静かに失敗しない)
 *
 * PH-issue-003: 追加 / 移動 / リサイズ全経路で overlap reject を強制するため、
 * 各 store メソッドが共通利用する純粋関数を集約する。
 *
 * 2026-05-19 無限 canvas 化: widget cell 座標は **符号付き整数 (負値許容)**。 grid の
 * 右端 / 下端 / 左端 / 上端の壁を撤廃したため、 配置可能範囲のクランプは行わない。
 * 唯一の配置制約は「widget 同士は重ならない」 のみ。
 */

export type Rect = { x: number; y: number; w: number; h: number };

/**
 * AABB (axis-aligned bounding box) overlap check.
 * 指定 rect (x, y, w, h) が `others` のいずれかと重なるか。
 */
export function wouldOverlapAt(
	x: number,
	y: number,
	w: number,
	h: number,
	others: Rect[],
): boolean {
	return others.some((o) => x < o.x + o.w && x + w > o.x && y < o.y + o.h && y + h > o.y);
}

/** spiral 探索のリング上限 (これを超えたら探索打ち切り、 通常到達しない安全網)。 */
const MAX_SEARCH_RING = 128;

/**
 * seed cell を起点に **同心円 (チェビシェフ距離) で最寄りの空きセル**を探す。
 *
 * 無限 canvas 化 (2026-05-19): grid 端の壁を撤廃したため探索範囲に上下左右の境界は無い。
 * 負座標も探索対象。 seed が空きならそのまま seed を返し、 埋まっていれば外側リングへ拡張する。
 * MAX_SEARCH_RING まで探して見つからなければ null (現実的には到達しない安全網)。
 *
 * @param seedX 起点 x (整数化される、 負値可)
 * @param seedY 起点 y (整数化される、 負値可)
 * @param w 配置 widget の幅
 * @param h 配置 widget の高さ
 * @param others 既存 widget の rect 配列
 */
export function findFreePositionNear(
	seedX: number,
	seedY: number,
	w: number,
	h: number,
	others: Rect[],
): { x: number; y: number } | null {
	const sx = Math.floor(seedX);
	const sy = Math.floor(seedY);
	if (!wouldOverlapAt(sx, sy, w, h, others)) return { x: sx, y: sy };
	for (let r = 1; r <= MAX_SEARCH_RING; r++) {
		// チェビシェフ距離 r のリングを走査
		for (let dy = -r; dy <= r; dy++) {
			for (let dx = -r; dx <= r; dx++) {
				if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
				const x = sx + dx;
				const y = sy + dy;
				if (!wouldOverlapAt(x, y, w, h, others)) return { x, y };
			}
		}
	}
	return null;
}

/** #12: drag preview の 1 box。x/y は実 cell 座標 (負値可)、blocked は overlap 判定。 */
export interface DragPreviewBox {
	x: number;
	y: number;
	w: number;
	h: number;
	blocked: boolean;
}

type GridWidget = {
	id: string;
	position_x: number;
	position_y: number;
	width: number;
	height: number;
};

/**
 * #12: 複数選択 widget を同 delta (dx, dy) で移動したときの drag preview box 群を計算する。
 *
 * `movingIds` に含まれる widget を delta 移動し、各 box の blocked (非移動 widget との overlap)
 * を判定する。複数選択 drag で「他選択 widget も同 delta で追従」を視覚化するための pure 関数。
 *
 * 2026-05-19 無限 canvas 化: grid 端の壁を撤廃したため越境判定は無く、 blocked は
 * 「非移動 widget との overlap」のみ。 移動 widget 同士は rigid に同 delta 移動するため衝突扱いしない。
 */
export function computeMoveDragPreviews(
	widgets: GridWidget[],
	movingIds: Set<string>,
	dx: number,
	dy: number,
): DragPreviewBox[] {
	const stationary: Rect[] = widgets
		.filter((w) => !movingIds.has(w.id))
		.map((w) => ({ x: w.position_x, y: w.position_y, w: w.width, h: w.height }));
	return widgets
		.filter((w) => movingIds.has(w.id))
		.map((w) => {
			const px = w.position_x + dx;
			const py = w.position_y + dy;
			const blocked = wouldOverlapAt(px, py, w.width, w.height, stationary);
			return { x: px, y: py, w: w.width, h: w.height, blocked };
		});
}
