import { describe, expect, it } from 'vitest';
import {
	clampWidget,
	computeMoveDragPreviews,
	findFreePosition,
	findFreePositionNear,
	type Rect,
	wouldOverlapAt,
} from './widget-grid';

/**
 * T4-1 (PR-Z2): widget-grid pure function test (wouldOverlapAt + findFreePosition)。
 * T4-2 (PR-Z3): clampWidget + findFreePositionNear test 追加。
 *
 * 引用元: docs/l1_requirements/test-rebuild/index.md (T4 phase、PH-issue-003)
 *
 * scope: overlap 判定 + 空きセル探索 + grid bound clamp + spiral 探索 (near 起点)。
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
		// 左上 (0,0,2,2) の右に隣接 (2,0,2,2) は重ならない
		expect(wouldOverlapAt(2, 0, 2, 2, others)).toBe(false);
	});

	it('others 空配列は常に false', () => {
		expect(wouldOverlapAt(0, 0, 10, 10, [])).toBe(false);
	});
});

describe('findFreePosition', () => {
	it('空 grid なら (0, 0) を返す', () => {
		expect(findFreePosition(2, 2, [], 4, 10)).toEqual({ x: 0, y: 0 });
	});

	it('左上が埋まっていたら次の空きを返す', () => {
		const others: Rect[] = [{ x: 0, y: 0, w: 2, h: 2 }];
		const r = findFreePosition(2, 2, others, 4, 10);
		expect(r).not.toBeNull();
		// (2, 0) または (0, 2) のいずれか
		expect(r).toMatchObject({ x: expect.any(Number), y: expect.any(Number) });
		// 既存と重ならない
		expect(wouldOverlapAt(r!.x, r!.y, 2, 2, others)).toBe(false);
	});

	it('grid 全埋まりなら null', () => {
		// 4x2 grid (cols=4, maxRow=1) を 2x1 widget 4 個で埋める
		const others: Rect[] = [
			{ x: 0, y: 0, w: 2, h: 1 },
			{ x: 2, y: 0, w: 2, h: 1 },
			{ x: 0, y: 1, w: 2, h: 1 },
			{ x: 2, y: 1, w: 2, h: 1 },
		];
		expect(findFreePosition(2, 1, others, 4, 1)).toBeNull();
	});

	it('cols より大きい widget は null', () => {
		// cols=4 で 5x1 widget は配置不可
		expect(findFreePosition(5, 1, [], 4, 10)).toBeNull();
	});
});

describe('clampWidget', () => {
	it('範囲内はそのまま', () => {
		expect(clampWidget({ position_x: 1, width: 2 }, 4)).toEqual({ x: 1, span: 2 });
	});

	it('position_x が cols 超過は cols-1 に clamp + span 1', () => {
		expect(clampWidget({ position_x: 10, width: 2 }, 4)).toEqual({ x: 3, span: 1 });
	});

	it('width が cols 超過は span を残り cell に clamp', () => {
		expect(clampWidget({ position_x: 0, width: 10 }, 4)).toEqual({ x: 0, span: 4 });
	});

	it('width 0 は最低 1 に clamp', () => {
		expect(clampWidget({ position_x: 0, width: 0 }, 4)).toEqual({ x: 0, span: 1 });
	});
});

describe('findFreePositionNear', () => {
	it('seed 位置が空きならそこを返す', () => {
		expect(findFreePositionNear(2, 3, 1, 1, [], 10, 10)).toEqual({ x: 2, y: 3 });
	});

	it('seed 位置が埋まってたら spiral 近隣を返す', () => {
		const others: Rect[] = [{ x: 2, y: 3, w: 1, h: 1 }];
		const r = findFreePositionNear(2, 3, 1, 1, others, 10, 10);
		expect(r).not.toBeNull();
		// 隣接 cell (chebyshev=1) のいずれか
		const dx = Math.abs(r!.x - 2);
		const dy = Math.abs(r!.y - 3);
		expect(Math.max(dx, dy)).toBe(1);
	});

	it('cols/maxRow を widget が超過する場合 null', () => {
		expect(findFreePositionNear(0, 0, 5, 1, [], 4, 10)).toBeNull();
		expect(findFreePositionNear(0, 0, 1, 100, [], 10, 10)).toBeNull();
	});

	it('seed が範囲外なら範囲内に clamp して探索', () => {
		// seed (-5, -5) は範囲内 (0, 0) に clamp、空 grid なので (0, 0)
		expect(findFreePositionNear(-5, -5, 1, 1, [], 4, 4)).toEqual({ x: 0, y: 0 });
	});
});

/**
 * #12: computeMoveDragPreviews — 複数選択 widget の同 delta drag preview。
 */
describe('computeMoveDragPreviews', () => {
	const widgets = [
		{ id: 'a', position_x: 0, position_y: 0, width: 2, height: 2 },
		{ id: 'b', position_x: 4, position_y: 0, width: 2, height: 2 },
		{ id: 'c', position_x: 8, position_y: 0, width: 2, height: 2 },
	];

	it('複数選択 widget を同 delta で移動した box を返す', () => {
		const r = computeMoveDragPreviews(widgets, new Set(['a', 'b']), 1, 3, 12, 32);
		expect(r).toHaveLength(2);
		expect(r[0]).toMatchObject({ x: 1, y: 3, w: 2, h: 2, blocked: false });
		expect(r[1]).toMatchObject({ x: 5, y: 3, w: 2, h: 2, blocked: false });
	});

	it('非移動 widget と重なる移動先は blocked', () => {
		const r = computeMoveDragPreviews(widgets, new Set(['a']), 4, 0, 12, 32);
		expect(r[0].blocked).toBe(true);
	});

	it('grid 右端を越える移動先は blocked', () => {
		const r = computeMoveDragPreviews(widgets, new Set(['c']), 3, 0, 12, 32);
		expect(r[0].blocked).toBe(true);
	});

	it('負座標は描画用に 0 クランプ、blocked は実座標で判定', () => {
		const r = computeMoveDragPreviews(widgets, new Set(['a']), -3, 0, 12, 32);
		expect(r[0].x).toBe(0);
		expect(r[0].blocked).toBe(true);
	});

	it('移動グループ同士は衝突扱いしない (rigid に同 delta 移動)', () => {
		const r = computeMoveDragPreviews(widgets, new Set(['a', 'b']), 2, 0, 12, 32);
		expect(r.every((p) => !p.blocked)).toBe(true);
	});
});
