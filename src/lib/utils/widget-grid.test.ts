import { describe, expect, it } from 'vitest';
import {
	clampWidget,
	findFreePosition,
	findFreePositionNear,
	type Rect,
	wouldOverlapAt,
} from './widget-grid';

/**
 * Codex Critical #1: spiral 探索 (findFreePositionNear) の挙動を固定する unit test。
 * 「seed が空 → seed をそのまま返す」「seed が埋まり → 最寄りを spiral で探す」「全埋まり → null」を保証。
 */
describe('findFreePositionNear (Codex Critical #1)', () => {
	it('seed が空なら seed を即返す', () => {
		const r = findFreePositionNear(2, 2, 2, 2, [], 8, 16);
		expect(r).toEqual({ x: 2, y: 2 });
	});

	it('seed が overlap → 周囲 spiral で最寄りの空きを返す', () => {
		const others: Rect[] = [{ x: 2, y: 2, w: 2, h: 2 }];
		// seed (2,2) は埋まり、(0,2) / (2,0) / (4,2) 等が候補。広い格子なら r=1 で見つかる。
		const r = findFreePositionNear(2, 2, 2, 2, others, 8, 16);
		expect(r).not.toBeNull();
		// 重ならないことを保証
		expect(wouldOverlapAt(r!.x, r!.y, 2, 2, others)).toBe(false);
		// seed からチェビシェフ距離 1〜2 の範囲内に収まる（top-left jump をしていない）
		expect(Math.max(Math.abs(r!.x - 2), Math.abs(r!.y - 2))).toBeLessThanOrEqual(2);
	});

	it('seed 起点で全 ring 走査しても見つからない時は top-left fallback を返す', () => {
		// (0,0)〜(7,15) 全部埋め、(0, 16) だけ空いている状態で seed (4, 8) → fallback で (0, 16) 返す
		const others: Rect[] = [];
		for (let y = 0; y <= 15; y++) {
			for (let x = 0; x <= 7; x++) {
				others.push({ x, y, w: 1, h: 1 });
			}
		}
		const r = findFreePositionNear(4, 8, 1, 1, others, 8, 16);
		expect(r).toEqual({ x: 0, y: 16 });
	});

	it('真に埋まっている時は null を返す', () => {
		const others: Rect[] = [];
		for (let y = 0; y <= 16; y++) {
			for (let x = 0; x <= 7; x++) {
				others.push({ x, y, w: 1, h: 1 });
			}
		}
		const r = findFreePositionNear(4, 8, 1, 1, others, 8, 16);
		expect(r).toBeNull();
	});

	it('w * h サイズが maxCols を超える widget は配置不可で null', () => {
		const r = findFreePositionNear(0, 0, 10, 1, [], 4, 16);
		expect(r).toBeNull();
	});

	it('seed が grid 外 → 内側にクランプして探索', () => {
		const r = findFreePositionNear(-5, -5, 2, 2, [], 8, 16);
		expect(r).toEqual({ x: 0, y: 0 });
	});
});

describe('findFreePosition (top-left scan, fallback)', () => {
	it('空のグリッドで (0,0) を返す', () => {
		expect(findFreePosition(2, 2, [], 4, 16)).toEqual({ x: 0, y: 0 });
	});

	it('(0,0) に widget があれば 右隣を返す', () => {
		const others: Rect[] = [{ x: 0, y: 0, w: 2, h: 2 }];
		expect(findFreePosition(2, 2, others, 4, 16)).toEqual({ x: 2, y: 0 });
	});
});

describe('wouldOverlapAt', () => {
	it('完全一致 = overlap', () => {
		expect(wouldOverlapAt(0, 0, 2, 2, [{ x: 0, y: 0, w: 2, h: 2 }])).toBe(true);
	});

	it('辺接触のみ = overlap せず', () => {
		expect(wouldOverlapAt(2, 0, 2, 2, [{ x: 0, y: 0, w: 2, h: 2 }])).toBe(false);
	});

	it('部分被り = overlap', () => {
		expect(wouldOverlapAt(1, 1, 2, 2, [{ x: 0, y: 0, w: 2, h: 2 }])).toBe(true);
	});
});

describe('clampWidget', () => {
	it('範囲内ならそのまま', () => {
		expect(clampWidget({ position_x: 1, width: 2 }, 4)).toEqual({ x: 1, span: 2 });
	});

	it('右端越え → span 縮小', () => {
		expect(clampWidget({ position_x: 3, width: 4 }, 4)).toEqual({ x: 3, span: 1 });
	});

	it('x が cols 超え → 末尾にクランプ + span 1', () => {
		expect(clampWidget({ position_x: 10, width: 2 }, 4)).toEqual({ x: 3, span: 1 });
	});
});
