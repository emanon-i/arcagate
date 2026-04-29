/**
 * Widget grid utilities — overlap 検出 / 空きスペース探索 / clamp。
 *
 * 引用元 guideline:
 * - docs/desktop_ui_ux_agent_rules.md P1 (状態) / P2 (失敗前提)
 * - docs/l1_requirements/ux_standards.md §13 (Workspace Canvas: widget 同士は重ならない)
 * - docs/l0_ideas/arcagate-engineering-principles.md §3 (静かに失敗しない)
 *
 * PH-issue-003: 追加 / 移動 / リサイズ全経路で overlap reject を強制するため、
 * 各 store メソッドが共通利用する純粋関数を集約する。
 */

export type Rect = { x: number; y: number; w: number; h: number };

export function clampWidget(
	widget: { position_x: number; width: number },
	cols: number,
): { x: number; span: number } {
	const x = Math.min(widget.position_x, Math.max(0, cols - 1));
	const span = Math.max(1, Math.min(widget.width, cols - x));
	return { x, span };
}

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

/**
 * 空きセルを左上から走査して最初の空き位置を返す。
 * **見つからなければ null** (PH-issue-003: (0,0) fallback バグ排除のため明示的 null)。
 *
 * @param w 配置 widget の幅
 * @param h 配置 widget の高さ
 * @param others 既存 widget の rect 配列
 * @param maxCols グリッド列数
 * @param maxRow 走査上限行 (これより下は配置不可)
 */
export function findFreePosition(
	w: number,
	h: number,
	others: Rect[],
	maxCols: number,
	maxRow: number,
): { x: number; y: number } | null {
	for (let y = 0; y <= maxRow; y++) {
		for (let x = 0; x <= maxCols - w; x++) {
			if (!wouldOverlapAt(x, y, w, h, others)) return { x, y };
		}
	}
	return null;
}

/**
 * Codex Critical #1: viewport center 起点の **spiral 探索**。
 * クリックで widget を追加した時、指定 cell が埋まっていたら top-left に飛ぶのでなく、
 * 指定 cell から広がる**同心円 (チェビシェフ距離)** で最寄りの空きセルを探す。
 * 見つからなければ findFreePosition (top-left 線形 scan) に fallback。
 *
 * @param seedX 起点 x（負値は 0 にクランプ）
 * @param seedY 起点 y（負値は 0 にクランプ）
 * @param w 配置 widget の幅
 * @param h 配置 widget の高さ
 * @param others 既存 widget の rect 配列
 * @param maxCols グリッド列数
 * @param maxRow 走査上限行
 */
export function findFreePositionNear(
	seedX: number,
	seedY: number,
	w: number,
	h: number,
	others: Rect[],
	maxCols: number,
	maxRow: number,
): { x: number; y: number } | null {
	// widget が grid に収まらないなら探索不要
	if (w > maxCols || h > maxRow + 1) return null;
	const sx = Math.max(0, Math.min(maxCols - w, Math.floor(seedX)));
	const sy = Math.max(0, Math.min(maxRow, Math.floor(seedY)));
	if (!wouldOverlapAt(sx, sy, w, h, others)) return { x: sx, y: sy };
	const maxRing = Math.max(maxCols, maxRow);
	for (let r = 1; r <= maxRing; r++) {
		// チェビシェフ距離 r のリングを上→右→下→左で走査
		for (let dy = -r; dy <= r; dy++) {
			for (let dx = -r; dx <= r; dx++) {
				if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
				const x = sx + dx;
				const y = sy + dy;
				if (x < 0 || y < 0 || x + w > maxCols || y > maxRow) continue;
				if (!wouldOverlapAt(x, y, w, h, others)) return { x, y };
			}
		}
	}
	// near では見つからないなら通常 scan で fallback
	return findFreePosition(w, h, others, maxCols, maxRow);
}
