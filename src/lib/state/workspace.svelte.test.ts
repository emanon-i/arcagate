import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceWidget } from '$lib/types/workspace';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

function mkWidget(id: string, x: number, y: number, w: number, h: number): WorkspaceWidget {
	return {
		id,
		workspace_id: 'ws-1',
		widget_type: 'recent',
		position_x: x,
		position_y: y,
		width: w,
		height: h,
		config: null,
		created_at: '',
		updated_at: '',
	};
}

describe('workspaceStore.findFreePosition', () => {
	let findFreePosition: (
		existingWidgets: WorkspaceWidget[],
		w: number,
		h: number,
		gridCols?: number,
	) => { x: number; y: number };

	beforeEach(async () => {
		vi.resetAllMocks();
		const { workspaceStore } = await import('./workspace.svelte');
		findFreePosition = workspaceStore.findFreePosition;
	});

	it('空グリッドに 1x1 を配置すると (0,0) を返す', () => {
		expect(findFreePosition([], 1, 1)).toEqual({ x: 0, y: 0 });
	});

	it('(0,0) に 1x1 が存在する場合 (1,0) を返す', () => {
		const widgets = [mkWidget('a', 0, 0, 1, 1)];
		expect(findFreePosition(widgets, 1, 1)).toEqual({ x: 1, y: 0 });
	});

	it('行 0 が 4 セルすべて埋まっている場合 (0,1) を返す', () => {
		const widgets = [
			mkWidget('a', 0, 0, 1, 1),
			mkWidget('b', 1, 0, 1, 1),
			mkWidget('c', 2, 0, 1, 1),
			mkWidget('d', 3, 0, 1, 1),
		];
		expect(findFreePosition(widgets, 1, 1)).toEqual({ x: 0, y: 1 });
	});

	it('gridCols=2 で両列が埋まっている場合 (0,1) を返す', () => {
		const widgets = [mkWidget('a', 0, 0, 1, 1), mkWidget('b', 1, 0, 1, 1)];
		expect(findFreePosition(widgets, 1, 1, 2)).toEqual({ x: 0, y: 1 });
	});

	it('空グリッドに 2x1 を配置すると (0,0) を返す', () => {
		expect(findFreePosition([], 2, 1)).toEqual({ x: 0, y: 0 });
	});

	it('(0,0,2,1) がある場合 2x1 ウィジェットは (2,0) に配置される', () => {
		// gridCols=4, w=2: x は 0,1,2 が候補。x=0 → 重複, x=1 → 重複, x=2 → 空き
		const widgets = [mkWidget('a', 0, 0, 2, 1)];
		expect(findFreePosition(widgets, 2, 1)).toEqual({ x: 2, y: 0 });
	});

	it('幅 4 のウィジェットを空グリッドに配置すると (0,0) を返す（gridCols=4 境界）', () => {
		expect(findFreePosition([], 4, 1)).toEqual({ x: 0, y: 0 });
	});

	it('(0,0,4,1) がある場合 幅 4 は (0,1) に配置される', () => {
		const widgets = [mkWidget('a', 0, 0, 4, 1)];
		expect(findFreePosition(widgets, 4, 1)).toEqual({ x: 0, y: 1 });
	});

	it('隣接するだけで重複しない（AABB 境界値確認）', () => {
		// widget at (1,0,1,1): 右隣。x=0 は重複なし → (0,0) を返す
		const widgets = [mkWidget('a', 1, 0, 1, 1)];
		expect(findFreePosition(widgets, 1, 1)).toEqual({ x: 0, y: 0 });
	});

	it('3x3 ウィジェットに内包される位置は重複が検出され x=3 に配置される', () => {
		// widget at (0,0,3,3): x=0,1,2 はすべて重複。x=3 は空き
		const widgets = [mkWidget('a', 0, 0, 3, 3)];
		expect(findFreePosition(widgets, 1, 1)).toEqual({ x: 3, y: 0 });
	});
});
