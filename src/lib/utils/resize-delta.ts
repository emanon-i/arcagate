import { t } from '$lib/i18n.svelte';

export type ResizeDir = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface ComputeRectOptions {
	maxSpan?: number;
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
// J-3 (2026-05-12 user 検収): widget の resize 上限が `maxSpan=4` (4×4 cell まで) と
// 早すぎ問題。 cell 12×12 まで拡張、現実的な大画面 1 widget の利用も可能に。
//
// 2026-05-19 無限 canvas 化: grid 端の壁を撤廃したため `maxCols` clamp を廃止。
// 左/上辺 resize で widget 起点が負座標になることを許容する (size 上限は `maxSpan` のみ)。
export function computeResize(
	start: Rect,
	stepDx: number,
	stepDy: number,
	dir: ResizeDir,
	{ maxSpan = 12 }: ComputeRectOptions = {},
): Rect {
	const minSize = 1;
	let { x, y, w, h } = start;

	// 横軸処理
	if (dir === 'e' || dir === 'ne' || dir === 'se') {
		w = clamp(start.w + stepDx, minSize, maxSpan);
	} else if (dir === 'w' || dir === 'nw' || dir === 'sw') {
		const newW = clamp(start.w - stepDx, minSize, maxSpan);
		x = start.x + (start.w - newW);
		w = newW;
	}

	// 縦軸処理
	if (dir === 's' || dir === 'sw' || dir === 'se') {
		h = clamp(start.h + stepDy, minSize, maxSpan);
	} else if (dir === 'n' || dir === 'nw' || dir === 'ne') {
		const newH = clamp(start.h - stepDy, minSize, maxSpan);
		y = start.y + (start.h - newH);
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
 * 提案された rect が他のウィジェットと重なる場合、重ならない最大に丸める。
 * 1 step ずつ start に向けて縮め、最初に non-overlap になった rect を返す。
 * 全 step で重なるなら start を返す（rubber-band 動作）。
 */
export function clampResizeForOverlap(start: Rect, proposed: Rect, others: OverlapTarget[]): Rect {
	if (!others.some((o) => overlaps(proposed, o))) return proposed;

	const dx = proposed.x - start.x;
	const dy = proposed.y - start.y;
	const dw = proposed.w - start.w;
	const dh = proposed.h - start.h;
	const steps = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dw), Math.abs(dh));
	for (let i = steps; i >= 0; i--) {
		const ratio = steps > 0 ? i / steps : 0;
		const cur: Rect = {
			x: Math.round(start.x + dx * ratio),
			y: Math.round(start.y + dy * ratio),
			w: Math.max(1, Math.round(start.w + dw * ratio)),
			h: Math.max(1, Math.round(start.h + dh * ratio)),
		};
		if (!others.some((o) => overlaps(cur, o))) return cur;
	}
	return start;
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

/**
 * Resize handle の aria-label を現在 locale で返す関数。
 * 定数オブジェクトでは locale 切替時に reactivity が無いため、
 * `widgetLabel()` パターンと同様に呼び出し毎 t() 経由で評価する。
 */
export function resizeLabel(dir: ResizeDir): string {
	return t(`workspace.resize_label.${dir}`);
}

/**
 * Backward-compat: 旧 callsite が `RESIZE_LABELS[dir]` で参照していたものに対応。
 * 各 access 毎に t() を呼ぶので locale 切替に追従する。
 * 新規実装では `resizeLabel(dir)` を直接使用すること。
 */
export const RESIZE_LABELS: Record<ResizeDir, string> = new Proxy({} as Record<ResizeDir, string>, {
	get(_target, prop: string) {
		return resizeLabel(prop as ResizeDir);
	},
});
