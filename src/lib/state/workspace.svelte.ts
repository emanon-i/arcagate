/**
 * PR-D: workspace.svelte.ts (旧 666 LOC) を 3 sub-store に分割した facade。
 *
 * 旧 store:
 * - `workspaceStore.workspaces / activeWorkspaceId / activeWorkspace / loading / error`
 * - workspace CRUD + widget CRUD + undo/redo を 1 ファイルに混載
 *
 * 新構成:
 * - `workspace-config.svelte.ts` (workspaceConfig) — workspace CRUD + 選択
 * - `workspace-widgets.svelte.ts` (workspaceWidgets) — widget CRUD + undo/redo
 * - `workspace-history.svelte.ts` (workspaceHistory) — Undo/Redo ring buffer (既存、変更なし)
 *
 * 旧 import path (`$lib/state/workspace.svelte` から `workspaceStore`) を維持するための薄い
 * facade。後続 cleanup PR で consumer を分割先に切り替えてからこの facade を削除する想定。
 *
 * 引用元 guideline:
 * - a3-frontend-shape.md §2.2 (sub-store 分割: config / widgets / history)
 * - A2 SV-1 (Class wrapper + singleton export pattern)
 * - A1 violation V4 解消 (config + behavior + history 混在 → 分割)
 *
 * 設計判断 (自分の判断で書いた箇所):
 * - 旧 single `loading` / `error` を `workspaceConfig.loading || workspaceWidgets.loading` の
 *   OR で derived 風に表現。consumer は読み取り専用なので互換性を保つ。
 * - findFreePosition も旧 store が re-export していたので維持 (consumer 側で利用)。
 */

import { workspaceConfig } from '$lib/state/workspace-config.svelte';
import { workspaceWidgets } from '$lib/state/workspace-widgets.svelte';
import { findFreePosition } from '$lib/utils/widget-grid';

export const workspaceStore = {
	get workspaces() {
		return workspaceConfig.workspaces;
	},
	get activeWorkspaceId() {
		return workspaceConfig.activeWorkspaceId;
	},
	get activeWorkspace() {
		return workspaceConfig.activeWorkspace;
	},
	get widgets() {
		return workspaceWidgets.widgets;
	},
	get loading() {
		return workspaceConfig.loading || workspaceWidgets.loading;
	},
	get error() {
		return workspaceConfig.error ?? workspaceWidgets.error;
	},
	// workspace config 系
	loadWorkspaces: () => workspaceConfig.loadWorkspaces(),
	createWorkspace: (name: string) => workspaceConfig.createWorkspace(name),
	updateWorkspace: (id: string, name: string) => workspaceConfig.updateWorkspace(id, name),
	replaceWorkspace: (updated: Parameters<typeof workspaceConfig.replaceWorkspace>[0]) =>
		workspaceConfig.replaceWorkspace(updated),
	deleteWorkspace: (id: string) => workspaceConfig.deleteWorkspace(id),
	selectWorkspace: (id: string) => workspaceConfig.selectWorkspace(id),
	// widget CRUD 系
	loadWidgets: (workspaceId: string) => workspaceWidgets.loadWidgets(workspaceId),
	addWidget: (
		widgetType: Parameters<typeof workspaceWidgets.addWidget>[0],
		nearCell?: Parameters<typeof workspaceWidgets.addWidget>[1],
		cols?: Parameters<typeof workspaceWidgets.addWidget>[2],
	) => workspaceWidgets.addWidget(widgetType, nearCell, cols),
	addWidgetAt: (
		widgetType: Parameters<typeof workspaceWidgets.addWidgetAt>[0],
		x: number,
		y: number,
		cols?: number,
	) => workspaceWidgets.addWidgetAt(widgetType, x, y, cols),
	bulkAddItemWidgets: (itemIds: string[]) => workspaceWidgets.bulkAddItemWidgets(itemIds),
	removeWidget: (id: string) => workspaceWidgets.removeWidget(id),
	updateWidgetConfig: (id: string, config: string | null) =>
		workspaceWidgets.updateWidgetConfig(id, config),
	persistWidgetOrder: (orderedWidgets: Parameters<typeof workspaceWidgets.persistWidgetOrder>[0]) =>
		workspaceWidgets.persistWidgetOrder(orderedWidgets),
	resizeWidget: (id: string, width: number, height: number) =>
		workspaceWidgets.resizeWidget(id, width, height),
	moveWidget: (id: string, x: number, y: number, cols?: number) =>
		workspaceWidgets.moveWidget(id, x, y, cols),
	optimisticResize: (id: string, width: number, height: number) =>
		workspaceWidgets.optimisticResize(id, width, height),
	optimisticMoveAndResize: (id: string, x: number, y: number, width: number, height: number) =>
		workspaceWidgets.optimisticMoveAndResize(id, x, y, width, height),
	persistMoveAndResize: (id: string, x: number, y: number, width: number, height: number) =>
		workspaceWidgets.persistMoveAndResize(id, x, y, width, height),
	commitMoveAndResize: (
		id: string,
		before: Parameters<typeof workspaceWidgets.commitMoveAndResize>[1],
		after: Parameters<typeof workspaceWidgets.commitMoveAndResize>[2],
		kind?: Parameters<typeof workspaceWidgets.commitMoveAndResize>[3],
	) => workspaceWidgets.commitMoveAndResize(id, before, after, kind),
	undo: () => workspaceWidgets.undo(),
	redo: () => workspaceWidgets.redo(),
	findFreePosition,
};
