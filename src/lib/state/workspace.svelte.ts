import * as workspaceIpc from '$lib/ipc/workspace';
import type { WidgetType, Workspace, WorkspaceWidget } from '$lib/types/workspace';
import { getErrorMessage } from '$lib/utils/format-error';
import { workspaceHistory } from './workspace-history.svelte';

let workspaces = $state<Workspace[]>([]);
let activeWorkspaceId = $state<string | null>(null);
let widgets = $state<WorkspaceWidget[]>([]);
let loading = $state(false);
let error = $state<string | null>(null);

const activeWorkspace = $derived(workspaces.find((w) => w.id === activeWorkspaceId) ?? null);

/** AABB overlap check: does rect (x, y, w, h) overlap any widget in the list? */
function isOverlapping(
	x: number,
	y: number,
	w: number,
	h: number,
	others: WorkspaceWidget[],
): boolean {
	return others.some(
		(ww) =>
			x < ww.position_x + ww.width &&
			x + w > ww.position_x &&
			y < ww.position_y + ww.height &&
			y + h > ww.position_y,
	);
}

/**
 * Find the first free grid position for a widget of size w x h.
 * Scans top-to-bottom, left-to-right in a virtual grid.
 * gridCols is the number of columns in the auto-fill grid (default 4).
 */
function findFreePosition(
	existingWidgets: WorkspaceWidget[],
	w: number,
	h: number,
	gridCols = 4,
): { x: number; y: number } {
	const maxY = Math.max(10, ...existingWidgets.map((ww) => ww.position_y + ww.height)) + h;

	for (let y = 0; y < maxY; y++) {
		for (let x = 0; x <= gridCols - w; x++) {
			if (!isOverlapping(x, y, w, h, existingWidgets)) return { x, y };
		}
	}
	// Fallback: place below everything
	return { x: 0, y: maxY };
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
		// PH-479: spread copy で reactive 確実化
		workspaces = workspaces.map((w) => (w.id === id ? { ...ws } : { ...w }));
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
		const widget = await workspaceIpc.addWidget(activeWorkspaceId, widgetType);
		// Auto-place at first free position
		const pos = findFreePosition(widgets, widget.width, widget.height);
		if (pos.x !== widget.position_x || pos.y !== widget.position_y) {
			await workspaceIpc.updateWidgetPosition(widget.id, pos.x, pos.y, widget.width, widget.height);
			widget.position_x = pos.x;
			widget.position_y = pos.y;
		}
		widgets = [...widgets, widget];
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
		const widget = await workspaceIpc.addWidget(activeWorkspaceId, widgetType);
		await workspaceIpc.updateWidgetPosition(widget.id, x, y, widget.width, widget.height);
		widget.position_x = x;
		widget.position_y = y;
		widgets = [...widgets, widget];
		// PH-477: history 記録
		workspaceHistory.record({
			kind: 'add',
			workspaceId: activeWorkspaceId,
			widgetId: widget.id,
			widgetType,
			rect: { x, y, w: widget.width, h: widget.height },
			config: widget.config ?? null,
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
		// PH-477: history 記録 (undo で復元できるよう snapshot を取る)
		if (target && wsId) {
			workspaceHistory.record({
				kind: 'remove',
				workspaceId: wsId,
				widgetId: id,
				widgetType: target.widget_type as WidgetType,
				rect: {
					x: target.position_x,
					y: target.position_y,
					w: target.width,
					h: target.height,
				},
				config: target.config ?? null,
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
	const target = widgets.find((w) => w.id === id);
	const before = target?.config ?? null;
	try {
		error = null;
		const updated = await workspaceIpc.updateWidgetConfig(id, config);
		// PH-479: 旧 .map では keyed each の widget prop が同 reference を保持するケースで
		// 子 widget の $derived(parseWidgetConfig(widget?.config, ...)) が再計算されない事例があるため、
		// **新オブジェクトに deep replace** + 全 widgets を新配列で置換 (Svelte 5 reactive を確実起動)
		widgets = widgets.map((w) => (w.id === id ? { ...updated } : { ...w }));
		// PH-477: config 変更を history に積む (idempotent な変更はスキップ)
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

	// PH-473: 重なる場合は配置を**拒否**（旧 findFreePosition 自動移動は予測不能 UX）
	const othersWithout = widgets.filter((w) => w.id !== id);
	if (isOverlapping(x, y, target.width, target.height, othersWithout)) {
		error = '他のウィジェットと重なるため配置できません';
		return;
	}

	const before = { x: target.position_x, y: target.position_y, w: target.width, h: target.height };
	widgets = widgets.map((w) => (w.id === id ? { ...w, position_x: x, position_y: y } : w));
	try {
		await workspaceIpc.updateWidgetPosition(id, x, y, target.width, target.height);
		// PH-477: history record (位置変化があった場合のみ)
		if (before.x !== x || before.y !== y) {
			workspaceHistory.record({
				kind: 'move',
				widgetId: id,
				before,
				after: { x, y, w: target.width, h: target.height },
			});
		}
	} catch (e) {
		error = getErrorMessage(e);
		widgets = widgets.map((w) =>
			w.id === id ? { ...w, position_x: target.position_x, position_y: target.position_y } : w,
		);
	}
}

/**
 * PH-473 helper: 指定座標 (x,y) が他のウィジェットと重なるかをチェック。
 * 移動 / drop preview の衝突判定で使用。
 */
function wouldOverlapAt(id: string, x: number, y: number): boolean {
	const target = widgets.find((w) => w.id === id);
	if (!target) return false;
	const others = widgets.filter((w) => w.id !== id);
	return isOverlapping(x, y, target.width, target.height, others);
}

/** PH-473: cell に既存 widget があるかどうか (drop preview 用) */
function isCellOccupied(x: number, y: number, w = 1, h = 1): boolean {
	return isOverlapping(x, y, w, h, widgets);
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
	const target = widgets.find((w) => w.id === id);
	// before snapshot は target が optimistic 更新済みのため、
	// move/resize の history では呼び出し元で beforeSnap を別途 capture すること。
	// ここでは IPC 永続のみ。
	try {
		await workspaceIpc.updateWidgetPosition(id, x, y, width, height);
	} catch (e) {
		error = getErrorMessage(e);
		if (activeWorkspaceId) {
			await loadWidgets(activeWorkspaceId);
		}
	}
	void target; // 未使用警告抑制
}

/**
 * PH-477: history 記録付きの move/resize commit。
 * before snapshot を呼び出し側で渡し、確定後に history に積む。
 */
async function commitMoveAndResize(
	id: string,
	before: { x: number; y: number; w: number; h: number },
	after: { x: number; y: number; w: number; h: number },
	kind: 'move' | 'resize' = 'move',
): Promise<void> {
	try {
		await workspaceIpc.updateWidgetPosition(id, after.x, after.y, after.w, after.h);
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
	findFreePosition,
	wouldOverlapAt,
	isCellOccupied,
};
