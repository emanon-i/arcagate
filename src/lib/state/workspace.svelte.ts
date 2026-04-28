import * as workspaceIpc from '$lib/ipc/workspace';
import { toastStore } from '$lib/state/toast.svelte';
import { workspaceHistory } from '$lib/state/workspace-history.svelte';
import type { WidgetType, Workspace, WorkspaceWidget } from '$lib/types/workspace';
import { getErrorMessage } from '$lib/utils/format-error';
import { findFreePosition, type Rect, wouldOverlapAt } from '$lib/utils/widget-grid';

let workspaces = $state<Workspace[]>([]);
let activeWorkspaceId = $state<string | null>(null);
let widgets = $state<WorkspaceWidget[]>([]);
let loading = $state(false);
let error = $state<string | null>(null);

const activeWorkspace = $derived(workspaces.find((w) => w.id === activeWorkspaceId) ?? null);

/**
 * PH-issue-003: 配置 / 移動の overlap 判定は `$lib/utils/widget-grid` の純粋関数に統一。
 * 旧 (0,0) fallback バグ排除のため `findFreePosition` は null 返却版を使う。
 */
const DEFAULT_GRID_COLS = 4;
const DEFAULT_MAX_ROW = 32;

function widgetsToRects(list: WorkspaceWidget[], excludeId?: string): Rect[] {
	return list
		.filter((w) => (excludeId ? w.id !== excludeId : true))
		.map((w) => ({ x: w.position_x, y: w.position_y, w: w.width, h: w.height }));
}

async function loadWorkspaces(): Promise<void> {
	loading = true;
	error = null;
	try {
		workspaces = await workspaceIpc.listWorkspaces();
		if (workspaces.length > 0 && activeWorkspaceId === null) {
			activeWorkspaceId = workspaces[0].id;
			await loadWidgets(workspaces[0].id);
		}
	} catch (e) {
		error = getErrorMessage(e);
	} finally {
		loading = false;
	}
}

async function createWorkspace(name: string): Promise<void> {
	loading = true;
	error = null;
	try {
		const ws = await workspaceIpc.createWorkspace(name);
		workspaces = [...workspaces, ws];
		activeWorkspaceId = ws.id;
		await seedDefaultWidgets(ws.id);
	} catch (e) {
		error = getErrorMessage(e);
	} finally {
		loading = false;
	}
}

async function updateWorkspace(id: string, name: string): Promise<void> {
	loading = true;
	error = null;
	try {
		const ws = await workspaceIpc.updateWorkspace(id, name);
		workspaces = workspaces.map((w) => (w.id === id ? ws : w));
	} catch (e) {
		error = getErrorMessage(e);
	} finally {
		loading = false;
	}
}

async function deleteWorkspace(id: string): Promise<void> {
	loading = true;
	error = null;
	try {
		await workspaceIpc.deleteWorkspace(id);
		workspaces = workspaces.filter((w) => w.id !== id);
		if (activeWorkspaceId === id) {
			activeWorkspaceId = workspaces.length > 0 ? workspaces[0].id : null;
			widgets = activeWorkspaceId ? await workspaceIpc.listWidgets(activeWorkspaceId) : [];
		}
	} catch (e) {
		error = getErrorMessage(e);
	} finally {
		loading = false;
	}
}

async function selectWorkspace(id: string): Promise<void> {
	activeWorkspaceId = id;
	await loadWidgets(id);
}

async function loadWidgets(workspaceId: string): Promise<void> {
	loading = true;
	error = null;
	try {
		widgets = await workspaceIpc.listWidgets(workspaceId);
		if (widgets.length === 0) {
			await seedDefaultWidgets(workspaceId);
		}
	} catch (e) {
		error = getErrorMessage(e);
	} finally {
		loading = false;
	}
}

async function seedDefaultWidgets(workspaceId: string): Promise<void> {
	const defaults: { type: WidgetType; x: number; y: number; w: number; h: number }[] = [
		{ type: 'favorites', x: 0, y: 0, w: 1, h: 2 },
		{ type: 'recent', x: 1, y: 0, w: 2, h: 1 },
		{ type: 'projects', x: 1, y: 1, w: 2, h: 1 },
	];
	for (const d of defaults) {
		const widget = await workspaceIpc.addWidget(workspaceId, d.type);
		await workspaceIpc.updateWidgetPosition(widget.id, d.x, d.y, d.w, d.h);
	}
	widgets = await workspaceIpc.listWidgets(workspaceId);
}

async function addWidget(widgetType: WidgetType): Promise<void> {
	if (!activeWorkspaceId) return;
	loading = true;
	error = null;
	try {
		// PH-issue-003: IPC 発行**前に** 空き position を求める。空きなしなら toast + 早期 return
		// (旧 (0,0) fallback で既存 widget と重なるバグの根本対策)。
		// 新規 widget のデフォルトサイズは Rust 側 (`workspace_service::add_widget`) と一致させる (2x2)
		const w = 2;
		const h = 2;
		const pos = findFreePosition(w, h, widgetsToRects(widgets), DEFAULT_GRID_COLS, DEFAULT_MAX_ROW);
		if (pos === null) {
			toastStore.add('空きスペースがありません。既存ウィジェットを縮小・削除してください', 'error');
			return;
		}
		const widget = await workspaceIpc.addWidget(activeWorkspaceId, widgetType);
		await workspaceIpc.updateWidgetPosition(widget.id, pos.x, pos.y, widget.width, widget.height);
		widget.position_x = pos.x;
		widget.position_y = pos.y;
		widgets = [...widgets, widget];
		// PH-issue-002: history record (add)
		workspaceHistory.record({
			kind: 'add',
			workspaceId: activeWorkspaceId,
			widgetId: widget.id,
			widgetType,
			rect: { x: widget.position_x, y: widget.position_y, w: widget.width, h: widget.height },
			config: widget.config,
		});
	} catch (e) {
		error = getErrorMessage(e);
	} finally {
		loading = false;
	}
}

async function addWidgetAt(widgetType: WidgetType, x: number, y: number): Promise<void> {
	if (!activeWorkspaceId) return;
	loading = true;
	error = null;
	try {
		// PH-issue-003: 指定セルが overlap なら拒否 + toast。別セルへの auto-rearrange は廃止
		// (user fb 「単純に重ならない」)。
		// 新規 widget のデフォルトサイズは Rust 側 (`workspace_service::add_widget`) と一致させる (2x2)
		const w = 2;
		const h = 2;
		if (wouldOverlapAt(x, y, w, h, widgetsToRects(widgets))) {
			toastStore.add('他のウィジェットと重なるため配置できません', 'error');
			return;
		}
		const widget = await workspaceIpc.addWidget(activeWorkspaceId, widgetType);
		await workspaceIpc.updateWidgetPosition(widget.id, x, y, widget.width, widget.height);
		widget.position_x = x;
		widget.position_y = y;
		widgets = [...widgets, widget];
		// PH-issue-002: history record (add)
		workspaceHistory.record({
			kind: 'add',
			workspaceId: activeWorkspaceId,
			widgetId: widget.id,
			widgetType,
			rect: { x, y, w: widget.width, h: widget.height },
			config: widget.config,
		});
	} catch (e) {
		error = getErrorMessage(e);
	} finally {
		loading = false;
	}
}

async function removeWidget(id: string): Promise<void> {
	loading = true;
	error = null;
	const target = widgets.find((w) => w.id === id);
	const wsId = activeWorkspaceId;
	try {
		await workspaceIpc.removeWidget(id);
		widgets = widgets.filter((w) => w.id !== id);
		// PH-issue-002: history record (remove)
		if (target && wsId) {
			workspaceHistory.record({
				kind: 'remove',
				workspaceId: wsId,
				widgetId: id,
				widgetType: target.widget_type,
				rect: {
					x: target.position_x,
					y: target.position_y,
					w: target.width,
					h: target.height,
				},
				config: target.config,
			});
		}
	} catch (e) {
		error = getErrorMessage(e);
	} finally {
		loading = false;
	}
}

async function persistWidgetOrder(orderedWidgets: WorkspaceWidget[]): Promise<void> {
	try {
		await Promise.all(
			orderedWidgets.map((w, i) =>
				workspaceIpc.updateWidgetPosition(w.id, w.position_x, i, w.width, w.height),
			),
		);
		widgets = orderedWidgets.map((w, i) => ({ ...w, position_y: i }));
	} catch (e) {
		error = getErrorMessage(e);
	}
}

async function updateWidgetConfig(id: string, config: string | null): Promise<void> {
	const before = widgets.find((w) => w.id === id)?.config ?? null;
	try {
		error = null;
		const updated = await workspaceIpc.updateWidgetConfig(id, config);
		widgets = widgets.map((w) => (w.id === id ? updated : w));
		// PH-issue-002: history record (config 変更)
		if (before !== config) {
			workspaceHistory.record({ kind: 'config', widgetId: id, before, after: config });
		}
	} catch (e) {
		error = getErrorMessage(e);
	}
}

async function resizeWidget(id: string, width: number, height: number): Promise<void> {
	const target = widgets.find((w) => w.id === id);
	if (!target) return;
	try {
		error = null;
		await workspaceIpc.updateWidgetPosition(
			id,
			target.position_x,
			target.position_y,
			width,
			height,
		);
		widgets = widgets.map((w) => (w.id === id ? { ...w, width, height } : w));
	} catch (e) {
		error = getErrorMessage(e);
	}
}

async function moveWidget(id: string, x: number, y: number): Promise<void> {
	const target = widgets.find((w) => w.id === id);
	if (!target) return;
	error = null;

	const before = {
		x: target.position_x,
		y: target.position_y,
		w: target.width,
		h: target.height,
	};

	// PH-issue-003: 移動先 overlap なら拒否 + toast、auto-rearrange 廃止
	// (user fb 「単純に重ならない」)。
	const others = widgetsToRects(widgets, id);
	if (wouldOverlapAt(x, y, target.width, target.height, others)) {
		toastStore.add('他のウィジェットと重なるため移動できません', 'error');
		return;
	}

	// Optimistic local update
	widgets = widgets.map((w) => (w.id === id ? { ...w, position_x: x, position_y: y } : w));
	try {
		await workspaceIpc.updateWidgetPosition(id, x, y, target.width, target.height);
		// PH-issue-002: history record (move) — 位置変化があれば積む
		const after = { x, y, w: target.width, h: target.height };
		if (before.x !== after.x || before.y !== after.y) {
			workspaceHistory.record({ kind: 'move', widgetId: id, before, after });
		}
	} catch (e) {
		error = getErrorMessage(e);
		// Rollback
		widgets = widgets.map((w) =>
			w.id === id ? { ...w, position_x: target.position_x, position_y: target.position_y } : w,
		);
	}
}

function optimisticResize(id: string, width: number, height: number): void {
	widgets = widgets.map((w) => (w.id === id ? { ...w, width, height } : w));
}

function optimisticMoveAndResize(
	id: string,
	x: number,
	y: number,
	width: number,
	height: number,
): void {
	widgets = widgets.map((w) =>
		w.id === id ? { ...w, position_x: x, position_y: y, width, height } : w,
	);
}

async function persistMoveAndResize(
	id: string,
	x: number,
	y: number,
	width: number,
	height: number,
): Promise<void> {
	try {
		await workspaceIpc.updateWidgetPosition(id, x, y, width, height);
	} catch (e) {
		error = getErrorMessage(e);
		if (activeWorkspaceId) {
			await loadWidgets(activeWorkspaceId);
		}
	}
}

/**
 * PH-issue-002: history 記録付きの move/resize commit (pointerup タイミングで呼ぶ)。
 * before snapshot を呼出側で渡し、確定後に history に積む。
 */
async function commitMoveAndResize(
	id: string,
	before: { x: number; y: number; w: number; h: number },
	after: { x: number; y: number; w: number; h: number },
	kind: 'move' | 'resize' = 'move',
): Promise<void> {
	try {
		await workspaceIpc.updateWidgetPosition(id, after.x, after.y, after.w, after.h);
		// 変化があれば record
		if (
			before.x !== after.x ||
			before.y !== after.y ||
			before.w !== after.w ||
			before.h !== after.h
		) {
			workspaceHistory.record({ kind, widgetId: id, before, after });
		}
	} catch (e) {
		error = getErrorMessage(e);
		if (activeWorkspaceId) {
			await loadWidgets(activeWorkspaceId);
		}
	}
}

/** PH-issue-002: Undo — 履歴 1 件を逆方向に IPC で適用、ローカル state も更新 */
async function undo(): Promise<void> {
	const entry = workspaceHistory.popUndo();
	if (!entry || !activeWorkspaceId) return;
	error = null;
	try {
		switch (entry.kind) {
			case 'add': {
				// add の undo = remove
				await workspaceIpc.removeWidget(entry.widgetId);
				widgets = widgets.filter((w) => w.id !== entry.widgetId);
				break;
			}
			case 'remove': {
				// remove の undo = add (新 widgetId が振られる)
				const widget = await workspaceIpc.addWidget(entry.workspaceId, entry.widgetType);
				await workspaceIpc.updateWidgetPosition(
					widget.id,
					entry.rect.x,
					entry.rect.y,
					entry.rect.w,
					entry.rect.h,
				);
				if (entry.config !== null) {
					await workspaceIpc.updateWidgetConfig(widget.id, entry.config);
				}
				// entry は popUndo で redoStack に push 済。同一参照を mutate して
				// 後続の redo(remove) が新 widget id を参照できるようにする。
				entry.widgetId = widget.id;
				if (activeWorkspaceId) await loadWidgets(activeWorkspaceId);
				break;
			}
			case 'move':
			case 'resize': {
				await workspaceIpc.updateWidgetPosition(
					entry.widgetId,
					entry.before.x,
					entry.before.y,
					entry.before.w,
					entry.before.h,
				);
				widgets = widgets.map((w) =>
					w.id === entry.widgetId
						? {
								...w,
								position_x: entry.before.x,
								position_y: entry.before.y,
								width: entry.before.w,
								height: entry.before.h,
							}
						: w,
				);
				break;
			}
			case 'config': {
				await workspaceIpc.updateWidgetConfig(entry.widgetId, entry.before);
				widgets = widgets.map((w) =>
					w.id === entry.widgetId ? { ...w, config: entry.before } : w,
				);
				break;
			}
		}
	} catch (e) {
		error = getErrorMessage(e);
		if (activeWorkspaceId) await loadWidgets(activeWorkspaceId);
	}
}

/** PH-issue-002: Redo — 履歴 1 件を順方向に再適用 */
async function redo(): Promise<void> {
	const entry = workspaceHistory.popRedo();
	if (!entry || !activeWorkspaceId) return;
	error = null;
	try {
		switch (entry.kind) {
			case 'add': {
				const widget = await workspaceIpc.addWidget(entry.workspaceId, entry.widgetType);
				await workspaceIpc.updateWidgetPosition(
					widget.id,
					entry.rect.x,
					entry.rect.y,
					entry.rect.w,
					entry.rect.h,
				);
				if (entry.config !== null) {
					await workspaceIpc.updateWidgetConfig(widget.id, entry.config);
				}
				// 後続の undo(add) が新 widget id を参照できるよう同一 entry を mutate。
				entry.widgetId = widget.id;
				if (activeWorkspaceId) await loadWidgets(activeWorkspaceId);
				break;
			}
			case 'remove': {
				await workspaceIpc.removeWidget(entry.widgetId);
				widgets = widgets.filter((w) => w.id !== entry.widgetId);
				break;
			}
			case 'move':
			case 'resize': {
				await workspaceIpc.updateWidgetPosition(
					entry.widgetId,
					entry.after.x,
					entry.after.y,
					entry.after.w,
					entry.after.h,
				);
				widgets = widgets.map((w) =>
					w.id === entry.widgetId
						? {
								...w,
								position_x: entry.after.x,
								position_y: entry.after.y,
								width: entry.after.w,
								height: entry.after.h,
							}
						: w,
				);
				break;
			}
			case 'config': {
				await workspaceIpc.updateWidgetConfig(entry.widgetId, entry.after);
				widgets = widgets.map((w) => (w.id === entry.widgetId ? { ...w, config: entry.after } : w));
				break;
			}
		}
	} catch (e) {
		error = getErrorMessage(e);
		if (activeWorkspaceId) await loadWidgets(activeWorkspaceId);
	}
}

export const workspaceStore = {
	get workspaces() {
		return workspaces;
	},
	get activeWorkspaceId() {
		return activeWorkspaceId;
	},
	get activeWorkspace() {
		return activeWorkspace;
	},
	get widgets() {
		return widgets;
	},
	get loading() {
		return loading;
	},
	get error() {
		return error;
	},
	loadWorkspaces,
	createWorkspace,
	updateWorkspace,
	deleteWorkspace,
	selectWorkspace,
	loadWidgets,
	addWidget,
	addWidgetAt,
	removeWidget,
	updateWidgetConfig,
	persistWidgetOrder,
	resizeWidget,
	moveWidget,
	optimisticResize,
	optimisticMoveAndResize,
	persistMoveAndResize,
	commitMoveAndResize,
	undo,
	redo,
	findFreePosition,
};
