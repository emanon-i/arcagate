import { describe, expect, it } from 'vitest';
import {
	computeMoveDragPreviews,
	findFreePositionNear,
	type Rect,
	wouldOverlapAt,
} from './widget-grid';

/**
 * widget-grid pure function test。
 *
 * scope: overlap 判定 + spiral 空きセル探索 + 複数選択 drag preview。
 *
 * 2026-05-19 無限 canvas 化: grid 端の壁を撤廃したため clampWidget / findFreePosition (有界
 * top-left scan) は廃止。 配置は findFreePositionNear (無界 spiral、 負座標可) に一本化、
 * drag preview の blocked 判定は overlap のみ。
 */
describe('wouldOverlapAt', () => {
	const others: Rect[] = [
		{ x: 0, y: 0, w: 2, h: 2 }, // 左上 2x2
		{ x: 5, y: 5, w: 1, h: 1 }, // 右下 1x1
	];

	it('既存と重ならない位置は false', () => {
		expect(wouldOverlapAt(3, 3, 1, 1, others)).toBe(false);
	});

	it('既存と完全重複は true', () => {
		expect(wouldOverlapAt(0, 0, 2, 2, others)).toBe(true);
	});

	it('部分重複 (角だけ重なる) は true', () => {
		expect(wouldOverlapAt(1, 1, 2, 2, others)).toBe(true);
	});

	it('境界で接する (touching but not overlapping) は false', () => {
		expect(wouldOverlapAt(2, 0, 2, 2, others)).toBe(false);
	});

	it('others 空配列は常に false', () => {
		expect(wouldOverlapAt(0, 0, 10, 10, [])).toBe(false);
	});

	it('負座標同士の overlap も検出する', () => {
		const neg: Rect[] = [{ x: -5, y: -5, w: 3, h: 3 }];
		expect(wouldOverlapAt(-4, -4, 2, 2, neg)).toBe(true);
		expect(wouldOverlapAt(-2, -2, 2, 2, neg)).toBe(false);
	});
});

describe('findFreePositionNear', () => {
	it('seed 位置が空きならそこを返す', () => {
		expect(findFreePositionNear(2, 3, 1, 1, [])).toEqual({ x: 2, y: 3 });
	});

	it('seed 位置が埋まってたら spiral 近隣 (chebyshev=1) を返す', () => {
		const others: Rect[] = [{ x: 2, y: 3, w: 1, h: 1 }];
		const r = findFreePositionNear(2, 3, 1, 1, others);
		expect(r).not.toBeNull();
		const dx = Math.abs((r as { x: number }).x - 2);
		const dy = Math.abs((r as { y: number }).y - 3);
		expect(Math.max(dx, dy)).toBe(1);
	});

	it('無限 canvas: 負座標の seed をそのまま使い、 負座標を返せる', () => {
		expect(findFreePositionNear(-10, -7, 2, 2, [])).toEqual({ x: -10, y: -7 });
	});

	it('無限 canvas: seed 周辺が埋まっていても壁に阻まれず外側リングへ拡張する', () => {
		// seed (0,0) を中心に chebyshev<=1 の 3x3 を 1x1 widget で全部埋める。
		const others: Rect[] = [];
		for (let x = -1; x <= 1; x++) {
			for (let y = -1; y <= 1; y++) others.push({ x, y, w: 1, h: 1 });
		}
		const r = findFreePositionNear(0, 0, 1, 1, others);
		expect(r).not.toBeNull();
		// chebyshev=2 のリング上に置かれる (左/上の壁が無いので負座標も候補)。
		const dx = Math.abs((r as { x: number }).x);
		const dy = Math.abs((r as { y: number }).y);
		expect(Math.max(dx, dy)).toBe(2);
		expect(wouldOverlapAt((r as Rect).x, (r as Rect).y, 1, 1, others)).toBe(false);
	});

	it('seed が小数でも floor して整数 cell から探索する', () => {
		expect(findFreePositionNear(3.8, 2.2, 1, 1, [])).toEqual({ x: 3, y: 2 });
	});
});

/**
 * computeMoveDragPreviews — 複数選択 widget の同 delta drag preview。
 */
describe('computeMoveDragPreviews', () => {
	const widgets = [
		{ id: 'a', position_x: 0, position_y: 0, width: 2, height: 2 },
		{ id: 'b', position_x: 4, position_y: 0, width: 2, height: 2 },
		{ id: 'c', position_x: 8, position_y: 0, width: 2, height: 2 },
	];

	it('複数選択 widget を同 delta で移動した box を返す', () => {
		const r = computeMoveDragPreviews(widgets, new Set(['a', 'b']), 1, 3);
		expect(r).toHaveLength(2);
		expect(r[0]).toMatchObject({ x: 1, y: 3, w: 2, h: 2, blocked: false });
		expect(r[1]).toMatchObject({ x: 5, y: 3, w: 2, h: 2, blocked: false });
	});

	it('非移動 widget と重なる移動先は blocked', () => {
		const r = computeMoveDragPreviews(widgets, new Set(['a']), 4, 0);
		expect(r[0].blocked).toBe(true);
	});

	it('無限 canvas: 負座標への移動は壁無しで blocked にならない', () => {
		const r = computeMoveDragPreviews(widgets, new Set(['a']), -3, -5);
		expect(r[0]).toMatchObject({ x: -3, y: -5, blocked: false });
	});

	it('無限 canvas: 右へ大きく移動しても壁無しで blocked にならない', () => {
		const r = computeMoveDragPreviews(widgets, new Set(['c']), 100, 100);
		expect(r[0]).toMatchObject({ x: 108, y: 100, blocked: false });
	});

	it('移動グループ同士は衝突扱いしない (rigid に同 delta 移動)', () => {
		const r = computeMoveDragPreviews(widgets, new Set(['a', 'b']), 2, 0);
		expect(r.every((p) => !p.blocked)).toBe(true);
	});
});
