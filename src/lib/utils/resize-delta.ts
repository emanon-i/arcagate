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

export interface OverlapTarget {
	x: number;
	y: number;
	w: number;
	h: number;
}

function overlaps(a: Rect, b: OverlapTarget): boolean {
	return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * PH-473: 提案された rect が他と重なる場合、**重なる手前の step で stop**。
 * 旧 rubber-band（全 step で縮めて non-overlap を探す）は予測不能 UX のため廃止。
 *
 * 戦略: start から proposed までを N step に分け、各 step で衝突チェック。
 * 最後に non-overlap だった rect を返す（= 重なり開始の手前）。
 */
export function clampResizeForOverlap(start: Rect, proposed: Rect, others: OverlapTarget[]): Rect {
	if (!others.some((o) => overlaps(proposed, o))) return proposed;

	const dx = proposed.x - start.x;
	const dy = proposed.y - start.y;
	const dw = proposed.w - start.w;
	const dh = proposed.h - start.h;
	const steps = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dw), Math.abs(dh));
	let lastSafe: Rect = start;
	for (let i = 0; i <= steps; i++) {
		const ratio = steps > 0 ? i / steps : 0;
		const cur: Rect = {
			x: Math.round(start.x + dx * ratio),
			y: Math.round(start.y + dy * ratio),
			w: Math.max(1, Math.round(start.w + dw * ratio)),
			h: Math.max(1, Math.round(start.h + dh * ratio)),
		};
		if (others.some((o) => overlaps(cur, o))) return lastSafe;
		lastSafe = cur;
	}
	return lastSafe;
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
