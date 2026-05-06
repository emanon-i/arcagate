import { describe, expect, it } from 'vitest';
import { findFreePosition, type Rect, wouldOverlapAt } from './widget-grid';

/**
 * T4-1 (PR-Z2): widget-grid pure function test。
 *
 * 引用元: docs/l1_requirements/test-rebuild/index.md (T4 phase、PH-issue-003)
 *
 * scope: wouldOverlapAt の overlap 判定 + findFreePosition の空きセル探索が
 * grid bound と既存 widget を考慮した正しい結果を返すこと。
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
