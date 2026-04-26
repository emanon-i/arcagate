export type ResizeDir = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface ComputeRectOptions {
	maxSpan?: number;
	maxCols?: number;
}

/**
 * Resize handle drag の delta から新しい (x, y, w, h) を計算する。
 * Pure function、UI 結合なし。
 *
 * 各方向は対応する辺だけを動かす:
 * - 'e' / 's' / 'se': width / height のみ増減（既存の動作）
 * - 'w' / 'nw' / 'sw': 左辺移動（x + w が固定、x 増減で w 補完）
 * - 'n' / 'ne' / 'nw': 上辺移動（y + h が固定、y 増減で h 補完）
 * - 'se' / 'ne' / 'sw' / 'nw': 角ハンドル（2 軸）
 */
export function computeResize(
	start: Rect,
	stepDx: number,
	stepDy: number,
	dir: ResizeDir,
	{ maxSpan = 4, maxCols = 32 }: ComputeRectOptions = {},
): Rect {
	const minSize = 1;
	let { x, y, w, h } = start;

	// 横軸処理
	if (dir === 'e' || dir === 'ne' || dir === 'se') {
		w = clamp(start.w + stepDx, minSize, Math.min(maxSpan, maxCols - start.x));
	} else if (dir === 'w' || dir === 'nw' || dir === 'sw') {
		const newW = clamp(start.w - stepDx, minSize, Math.min(maxSpan, start.x + start.w));
		const newX = start.x + (start.w - newW);
		x = clamp(newX, 0, maxCols - 1);
		w = newW;
	}

	// 縦軸処理
	if (dir === 's' || dir === 'sw' || dir === 'se') {
		h = clamp(start.h + stepDy, minSize, maxSpan);
	} else if (dir === 'n' || dir === 'nw' || dir === 'ne') {
		const newH = clamp(start.h - stepDy, minSize, start.y + start.h);
		const newY = start.y + (start.h - newH);
		y = Math.max(0, newY);
		h = newH;
	}

	return { x, y, w, h };
}

function clamp(v: number, lo: number, hi: number): number {
	return Math.max(lo, Math.min(hi, v));
}

export const RESIZE_CURSORS: Record<ResizeDir, string> = {
	n: 'ns-resize',
	s: 'ns-resize',
	e: 'ew-resize',
	w: 'ew-resize',
	ne: 'nesw-resize',
	sw: 'nesw-resize',
	nw: 'nwse-resize',
	se: 'nwse-resize',
};

export const RESIZE_LABELS: Record<ResizeDir, string> = {
	n: 'ウィジェットの上端を移動',
	s: 'ウィジェットの下端を移動',
	e: 'ウィジェットの右端を移動',
	w: 'ウィジェットの左端を移動',
	ne: 'ウィジェットの右上角を移動',
	se: 'ウィジェットの幅と高さを変更',
	sw: 'ウィジェットの左下角を移動',
	nw: 'ウィジェットの左上角を移動',
};
