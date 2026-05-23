import { describe, expect, it } from 'vitest';
import { cellFromClient, cellFromPhysicalPosition, type DropZoneGeometry } from './drop-coords';

/**
 * PH-CF-200: OS file drop の座標 → cell 変換 pure logic の unit test。
 *
 * 引用元 guideline:
 * - `docs/l3_phases/clean-feedback/PH-CF-200_workspace-dnd-placement.md` §タスク 2
 *
 * 計算:
 *   cellW = widgetW + 16 (GRID_GAP)
 *   cellH = widgetH + 16
 *   relX = clientX - rect.left, relY = clientY - rect.top
 *   cellX = floor(relX / cellW), cellY = floor(relY / cellH)
 *   範囲外 (relX/relY 負 / cellX>=dynamicCols / cellY>=maxRow) → null
 */
function makeGeom(overrides: Partial<DropZoneGeometry> = {}): DropZoneGeometry {
	return {
		rect: { left: 0, top: 0 },
		widgetW: 240,
		widgetH: 240,
		dynamicCols: 24,
		maxRow: 64,
		...overrides,
	};
}

describe('cellFromClient', () => {
	it('drop zone の左上端 (rect.left, rect.top) なら (0, 0)', () => {
		const geom = makeGeom({ rect: { left: 100, top: 50 } });
		expect(cellFromClient(100, 50, geom)).toEqual({ x: 0, y: 0 });
	});

	it('cellW = widgetW + 16 / cellH = widgetH + 16 で割って floor', () => {
		const geom = makeGeom();
		// widgetW=240 → cellW=256、 widgetH=240 → cellH=256
		// clientX=520 → relX=520 → 520/256 = 2.03 → floor=2
		// clientY=300 → relY=300 → 300/256 = 1.17 → floor=1
		expect(cellFromClient(520, 300, geom)).toEqual({ x: 2, y: 1 });
	});

	it('drop zone の左 / 上を超えたら null (rect 外 drop)', () => {
		const geom = makeGeom({ rect: { left: 100, top: 50 } });
		expect(cellFromClient(99, 50, geom)).toBeNull();
		expect(cellFromClient(100, 49, geom)).toBeNull();
	});

	it('cellX が dynamicCols 以上なら null', () => {
		const geom = makeGeom({ dynamicCols: 2 }); // 0, 1 のみ valid
		// clientX = 600 → cellX = floor(600/256) = 2 → 範囲外
		expect(cellFromClient(600, 100, geom)).toBeNull();
	});

	it('cellY が maxRow 以上なら null', () => {
		const geom = makeGeom({ maxRow: 1 }); // 0 のみ valid
		// clientY = 300 → cellY = floor(300/256) = 1 → 範囲外
		expect(cellFromClient(100, 300, geom)).toBeNull();
	});

	it('widgetW / widgetH / dynamicCols / maxRow が 0 以下なら null (未登録 sentinel)', () => {
		expect(cellFromClient(100, 100, makeGeom({ widgetW: 0 }))).toBeNull();
		expect(cellFromClient(100, 100, makeGeom({ widgetH: 0 }))).toBeNull();
		expect(cellFromClient(100, 100, makeGeom({ dynamicCols: 0 }))).toBeNull();
		expect(cellFromClient(100, 100, makeGeom({ maxRow: 0 }))).toBeNull();
	});

	it('zoom 変化に追従 (widgetW が小さい場合は cellW も小さく、 同じ client 座標が違う cell)', () => {
		// zoom 50% で widgetW=120 → cellW=136
		const smallGeom = makeGeom({ widgetW: 120, widgetH: 120 });
		// clientX=300 → 300/136 = 2.20 → floor=2
		expect(cellFromClient(300, 0, smallGeom)).toEqual({ x: 2, y: 0 });
		// zoom 100% (default 240) → 300/256 = 1.17 → floor=1
		expect(cellFromClient(300, 0, makeGeom())).toEqual({ x: 1, y: 0 });
	});

	it('drop zone の scroll 移動も rect.left/top に反映される (rect 引数経由)', () => {
		// canvas を 200 px scroll した状態 → dropZone.rect.left が -200 へ
		const scrolledGeom = makeGeom({ rect: { left: -200, top: 0 } });
		// 同じ clientX=300 でも、 scroll 後は relX=500 → floor(500/256)=1
		expect(cellFromClient(300, 0, scrolledGeom)).toEqual({ x: 1, y: 0 });
	});
});

describe('cellFromPhysicalPosition', () => {
	it('DPR=2 なら device px を 2 で割って client 座標として扱う', () => {
		// PhysicalPosition (1040, 600) @ DPR=2 → CSS (520, 300) → cell (2, 1)
		expect(cellFromPhysicalPosition({ x: 1040, y: 600 }, 2, makeGeom())).toEqual({
			x: 2,
			y: 1,
		});
	});

	it('DPR=1 (low DPI) なら device = CSS', () => {
		// PhysicalPosition (520, 300) @ DPR=1 → CSS (520, 300) → cell (2, 1)
		expect(cellFromPhysicalPosition({ x: 520, y: 300 }, 1, makeGeom())).toEqual({
			x: 2,
			y: 1,
		});
	});

	it('DPR=0 (invalid) でも 1 として安全に扱う (ZeroDivision にならない)', () => {
		expect(cellFromPhysicalPosition({ x: 520, y: 300 }, 0, makeGeom())).toEqual({
			x: 2,
			y: 1,
		});
	});

	it('drop zone 未登録 (widgetW=0) なら null', () => {
		expect(cellFromPhysicalPosition({ x: 100, y: 100 }, 2, makeGeom({ widgetW: 0 }))).toBeNull();
	});
});
