import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Workspace, WorkspaceWidget } from '$lib/types/workspace';

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

const mockWorkspace: Workspace = {
	id: 'ws-1',
	name: 'Default',
	sort_order: 0,
	created_at: '',
	updated_at: '',
};

describe('workspaceStore IPC', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.resetAllMocks();
	});

	it('loadWorkspaces() でワークスペースと activeWorkspaceId が設定される', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke)
			.mockResolvedValueOnce([mockWorkspace]) // cmd_list_workspaces
			.mockResolvedValueOnce([mkWidget('w1', 0, 0, 1, 1)]); // cmd_list_widgets (has widget → no seed)

		const { workspaceStore } = await import('./workspace.svelte');
		await workspaceStore.loadWorkspaces();

		expect(workspaceStore.workspaces).toHaveLength(1);
		expect(workspaceStore.activeWorkspaceId).toBe('ws-1');
		expect(workspaceStore.widgets).toHaveLength(1);
	});

	it('activeWorkspace は activeWorkspaceId に対応する workspace を返す', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke)
			.mockResolvedValueOnce([mockWorkspace])
			.mockResolvedValueOnce([mkWidget('w1', 0, 0, 1, 1)]);

		const { workspaceStore } = await import('./workspace.svelte');
		await workspaceStore.loadWorkspaces();

		expect(workspaceStore.activeWorkspace?.name).toBe('Default');
	});

	it('workspaces が空のとき activeWorkspace は null', async () => {
		const { workspaceStore } = await import('./workspace.svelte');
		expect(workspaceStore.activeWorkspace).toBeNull();
	});

	it('loadWorkspaces() IPC エラー時に error state が設定される', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke).mockRejectedValueOnce(new Error('connection failed'));

		const { workspaceStore } = await import('./workspace.svelte');
		await workspaceStore.loadWorkspaces();

		expect(workspaceStore.error).toContain('connection failed');
	});

	it('removeWidget() でウィジェットが配列から削除される', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke)
			.mockResolvedValueOnce([mockWorkspace]) // listWorkspaces
			.mockResolvedValueOnce([mkWidget('w1', 0, 0, 1, 1), mkWidget('w2', 1, 0, 1, 1)]) // listWidgets
			.mockResolvedValueOnce(undefined); // removeWidget

		const { workspaceStore } = await import('./workspace.svelte');
		await workspaceStore.loadWorkspaces();
		await workspaceStore.removeWidget('w1');

		expect(workspaceStore.widgets).toHaveLength(1);
		expect(workspaceStore.widgets[0].id).toBe('w2');
	});

	it('addWidget() でウィジェットが配列に追加される', async () => {
		const newWidget = mkWidget('w-new', 0, 0, 1, 1);
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke)
			.mockResolvedValueOnce([mockWorkspace]) // listWorkspaces
			.mockResolvedValueOnce([mkWidget('w1', 0, 0, 1, 1)]) // listWidgets (1 widget)
			.mockResolvedValueOnce(newWidget) // addWidget → returns widget at (0,0)
			.mockResolvedValueOnce(undefined); // updateWidgetPosition (auto-place to (1,0))

		const { workspaceStore } = await import('./workspace.svelte');
		await workspaceStore.loadWorkspaces();
		await workspaceStore.addWidget('recent');

		expect(workspaceStore.widgets).toHaveLength(2);
	});

	it('moveWidget() 衝突なしの場合、指定位置に移動する', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke)
			.mockResolvedValueOnce([mockWorkspace])
			.mockResolvedValueOnce([mkWidget('w1', 0, 0, 1, 1), mkWidget('w2', 1, 0, 1, 1)])
			.mockResolvedValueOnce(undefined); // updateWidgetPosition for moveWidget

		const { workspaceStore } = await import('./workspace.svelte');
		await workspaceStore.loadWorkspaces();
		await workspaceStore.moveWidget('w2', 2, 0); // (2,0) は空き

		expect(workspaceStore.widgets.find((w) => w.id === 'w2')?.position_x).toBe(2);
	});

	it('moveWidget() 衝突ありの場合、findFreePosition で代替位置に移動する', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke)
			.mockResolvedValueOnce([mockWorkspace])
			.mockResolvedValueOnce([mkWidget('w1', 0, 0, 1, 1), mkWidget('w2', 1, 0, 1, 1)])
			.mockResolvedValueOnce(undefined); // updateWidgetPosition for moveWidget

		const { workspaceStore } = await import('./workspace.svelte');
		await workspaceStore.loadWorkspaces();
		// w2(1,0) を w1 のある (0,0) に移動 → 衝突 → findFreePosition([w1], 1, 1) → (1,0)
		await workspaceStore.moveWidget('w2', 0, 0);

		expect(workspaceStore.widgets.find((w) => w.id === 'w2')?.position_x).toBe(1);
	});

	it('deleteWorkspace() アクティブ削除で activeWorkspaceId が null になる', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke)
			.mockResolvedValueOnce([mockWorkspace]) // listWorkspaces
			.mockResolvedValueOnce([mkWidget('w1', 0, 0, 1, 1)]) // listWidgets
			.mockResolvedValueOnce(undefined); // deleteWorkspace

		const { workspaceStore } = await import('./workspace.svelte');
		await workspaceStore.loadWorkspaces();
		await workspaceStore.deleteWorkspace('ws-1');

		expect(workspaceStore.workspaces).toHaveLength(0);
		expect(workspaceStore.activeWorkspaceId).toBeNull();
	});
});
