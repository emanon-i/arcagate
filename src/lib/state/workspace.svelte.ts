import * as workspaceIpc from '$lib/ipc/workspace';
import { toastStore } from '$lib/state/toast.svelte';
import { workspaceHistory } from '$lib/state/workspace-history.svelte';
import type { WidgetType, Workspace, WorkspaceWidget } from '$lib/types/workspace';
import { getErrorMessage } from '$lib/utils/format-error';
import { removeKey } from '$lib/utils/local-storage';
import {
	findFreePosition,
	findFreePositionNear,
	type Rect,
	wouldOverlapAt,
} from '$lib/utils/widget-grid';
import { widgetRegistry } from '$lib/widgets';

/**
 * 検収 #7: widget タイプごとの推奨デフォルトサイズを registry から取得する helper。
 * registry の `defaultSize` が無い場合は (2, 2) にフォールバック。
 */
function defaultSizeFor(type: WidgetType): { w: number; h: number } {
	return widgetRegistry[type]?.defaultSize ?? { w: 2, h: 2 };
}

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
		// 初回起動時 (workspaces 0 件) は空 Home workspace を auto-create。default widget seed は無し
		// (検収 #3: user が並べる)。
		if (workspaces.length === 0) {
			const ws = await workspaceIpc.createWorkspace('Home');
			workspaces = [ws];
			activeWorkspaceId = ws.id;
			widgets = [];
			return;
		}
		if (activeWorkspaceId === null) {
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
		widgets = [];
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
		// PR #268 Codex review #10: workspace 削除時に per-workspace pan key を localStorage から
		// GC して quota 圧迫を防ぐ。既存 helper 経由で SecurityError も握り潰す。
		removeKey(`arcagate.workspace.pan.${id}`);
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

/**
 * PH-issue-009 Phase B: store の workspaces 配列内で 1 件だけ in-place replace。
 * IPC で更新後の Workspace を反映するために使用 (壁紙変更時に即時 canvas 反映)。
 */
function replaceWorkspace(updated: Workspace): void {
	workspaces = workspaces.map((w) => (w.id === updated.id ? updated : w));
}

async function loadWidgets(workspaceId: string): Promise<void> {
	loading = true;
	error = null;
	try {
		widgets = await workspaceIpc.listWidgets(workspaceId);
		// 検収 #3: 新規 / 空 workspace は空のまま。default widget seed は撤廃 (user 自身が並べる)。
	} catch (e) {
		error = getErrorMessage(e);
	} finally {
		loading = false;
	}
}

async function addWidget(
	widgetType: WidgetType,
	nearCell?: { x: number; y: number },
	cols?: number,
): Promise<void> {
	if (!activeWorkspaceId) return;
	loading = true;
	error = null;
	try {
		// 検収 #7: widget タイプ別 defaultSize (Clock 1x1 等の極小化を防止)。
		// Rust 側はサイズ 2x2 で row 末尾に作成するため、追加直後に widget タイプ別サイズに更新する。
		const { w, h } = defaultSizeFor(widgetType);
		// 検収 #5 + Codex Critical #1: nearCell 起点の **spiral 探索**。
		// 指定 cell が埋まっていたら top-left に飛ばず、最寄りの空きセルを spiral で探す
		// (top-left fallback は near が見つからない時のみ)。
		// Codex r3 #1: viewport 幅から導出された responsive `cols` を尊重 (旧 fix=4 は wide canvas で
		// drop preview と addWidgetAt の判定 mismatch を起こしていた)。
		const effectiveCols = Math.max(DEFAULT_GRID_COLS, cols ?? DEFAULT_GRID_COLS);
		const rects = widgetsToRects(widgets);
		const pos = nearCell
			? findFreePositionNear(nearCell.x, nearCell.y, w, h, rects, effectiveCols, DEFAULT_MAX_ROW)
			: findFreePosition(w, h, rects, effectiveCols, DEFAULT_MAX_ROW);
		if (pos === null) {
			toastStore.add('空きスペースがありません。既存ウィジェットを縮小・削除してください', 'error');
			return;
		}
		const widget = await workspaceIpc.addWidget(activeWorkspaceId, widgetType);
		await workspaceIpc.updateWidgetPosition(widget.id, pos.x, pos.y, w, h);
		widget.position_x = pos.x;
		widget.position_y = pos.y;
		widget.width = w;
		widget.height = h;
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

async function addWidgetAt(
	widgetType: WidgetType,
	x: number,
	y: number,
	cols?: number,
): Promise<void> {
	if (!activeWorkspaceId) return;
	loading = true;
	error = null;
	try {
		// 検収 #7: widget タイプ別 defaultSize を使う。
		const { w, h } = defaultSizeFor(widgetType);
		// Codex r2 #2 + r3 #1: grid 右端越え reject。preview と一致する `cols` を caller から
		// 受け取り、wide canvas (responsive dynamicCols > 4) と狭い canvas で同じ判定に。
		const effectiveCols = Math.max(DEFAULT_GRID_COLS, cols ?? DEFAULT_GRID_COLS);
		if (x + w > effectiveCols || y + h > DEFAULT_MAX_ROW + 1) {
			toastStore.add('グリッド範囲外のため配置できません', 'error');
			return;
		}
		if (wouldOverlapAt(x, y, w, h, widgetsToRects(widgets))) {
			toastStore.add('他のウィジェットと重なるため配置できません', 'error');
			return;
		}
		const widget = await workspaceIpc.addWidget(activeWorkspaceId, widgetType);
		await workspaceIpc.updateWidgetPosition(widget.id, x, y, w, h);
		widget.position_x = x;
		widget.position_y = y;
		widget.width = w;
		widget.height = h;
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

/**
 * PH-issue-025 / Issue 8: 複数 itemId を一括で ItemWidget として配置。
 * 1 つずつ findFreePosition で配置、overlap が解消できなくなったら toast でその時点までで停止。
 * 戻り値: 実際に配置成功した個数。
 */
async function bulkAddItemWidgets(itemIds: string[]): Promise<number> {
	if (!activeWorkspaceId || itemIds.length === 0) return 0;
	loading = true;
	error = null;
	let placed = 0;
	try {
		for (const itemId of itemIds) {
			const { w, h } = defaultSizeFor('item');
			const pos = findFreePosition(
				w,
				h,
				widgetsToRects(widgets),
				DEFAULT_GRID_COLS,
				DEFAULT_MAX_ROW,
			);
			if (pos === null) {
				toastStore.add(
					`空きスペースがないため ${itemIds.length - placed} 個の追加を停止しました`,
					'error',
				);
				break;
			}
			const widget = await workspaceIpc.addWidget(activeWorkspaceId, 'item');
			await workspaceIpc.updateWidgetPosition(widget.id, pos.x, pos.y, w, h);
			const config = JSON.stringify({ item_id: itemId });
			const updated = await workspaceIpc.updateWidgetConfig(widget.id, config);
			updated.position_x = pos.x;
			updated.position_y = pos.y;
			updated.width = w;
			updated.height = h;
			widgets = [...widgets, updated];
			workspaceHistory.record({
				kind: 'add',
				workspaceId: activeWorkspaceId,
				widgetId: updated.id,
				widgetType: 'item',
				rect: { x: pos.x, y: pos.y, w: updated.width, h: updated.height },
				config: updated.config,
			});
			placed++;
		}
	} catch (e) {
		error = getErrorMessage(e);
	} finally {
		loading = false;
	}
	return placed;
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
	replaceWorkspace,
	deleteWorkspace,
	selectWorkspace,
	loadWidgets,
	addWidget,
	addWidgetAt,
	bulkAddItemWidgets,
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
