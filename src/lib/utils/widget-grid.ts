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
 * 4/30 user 検収 #5: 現在 viewport が見ている grid cell 範囲内で空きを探索する。
 * 旧実装は `findFreePosition(0, 0, ...)` で常に左上 cell から探索 → user の現在の pan
 * 位置と無関係に widget が画面外に置かれる症状があった。
 *
 * - originX/Y を中心に、外向き (距離が短い順) で空き cell を探索する。
 * - viewport を超える cell も探索対象 (見つからなければ findFreePosition で fallback)。
 * - 大幅な探索範囲 (search radius) は 6 に制限 (typical viewport で 6 行 6 列 = 36 cells)。
 */
export function findFreePositionNear(
	w: number,
	h: number,
	others: Rect[],
	maxCols: number,
	maxRow: number,
	originX: number,
	originY: number,
	searchRadius = 6,
): { x: number; y: number } | null {
	const startX = Math.max(0, Math.min(originX, maxCols - w));
	const startY = Math.max(0, Math.min(originY, maxRow));
	if (!wouldOverlapAt(startX, startY, w, h, others)) {
		return { x: startX, y: startY };
	}
	for (let r = 1; r <= searchRadius; r++) {
		// 距離 r の cells (Chebyshev / 8-neighbor) を試す
		for (let dy = -r; dy <= r; dy++) {
			for (let dx = -r; dx <= r; dx++) {
				if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
				const x = startX + dx;
				const y = startY + dy;
				// Codex review #3 fix: widget の bottom edge は y + h - 1 なので、
				// 旧 `y > maxRow` だと widget が maxRow を超えても通ってしまうバグ。
				if (x < 0 || y < 0 || x + w > maxCols || y + h > maxRow + 1) continue;
				if (!wouldOverlapAt(x, y, w, h, others)) {
					return { x, y };
				}
			}
		}
	}
	return null;
}
