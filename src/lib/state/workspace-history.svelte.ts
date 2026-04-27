/**
 * PH-477: Widget 操作の Undo/Redo history。
 *
 * 設計:
 * - Ring buffer 50 件 (超過時は古い entry を drop)
 * - 確定操作のみ record (drag 中の optimistic state は積まない)
 * - undo/redo は kind ごとに workspaceStore の逆操作を呼び出す
 * - エラー時は history pointer が壊れないよう try-catch + log
 */

import * as workspaceIpc from '$lib/ipc/workspace';
import type { WidgetType, WorkspaceWidget } from '$lib/types/workspace';

interface RectSnap {
	x: number;
	y: number;
	w: number;
	h: number;
}

export type HistoryEntry =
	| {
			kind: 'add';
			workspaceId: string;
			widgetId: string;
			widgetType: WidgetType;
			rect: RectSnap;
			config: string | null;
	  }
	| {
			kind: 'remove';
			workspaceId: string;
			widgetId: string;
			widgetType: WidgetType;
			rect: RectSnap;
			config: string | null;
	  }
	| {
			kind: 'move' | 'resize';
			widgetId: string;
			before: RectSnap;
			after: RectSnap;
	  }
	| {
			kind: 'config';
			widgetId: string;
			before: string | null;
			after: string | null;
	  };

const MAX_HISTORY = 50;

let undoStack = $state<HistoryEntry[]>([]);
let redoStack = $state<HistoryEntry[]>([]);

function record(entry: HistoryEntry) {
	undoStack = [...undoStack, entry].slice(-MAX_HISTORY);
	// 新規操作で redo は無効化
	redoStack = [];
}

function snapshotOf(w: WorkspaceWidget): RectSnap {
	return { x: w.position_x, y: w.position_y, w: w.width, h: w.height };
}

async function applyEntry(entry: HistoryEntry, direction: 'undo' | 'redo'): Promise<void> {
	// undo は entry の「逆」操作、redo は entry の「順」操作。
	// add / remove は鏡映、move / resize / config は before/after を入れ替える。
	if (entry.kind === 'add') {
		if (direction === 'undo') {
			await workspaceIpc.removeWidget(entry.widgetId);
		} else {
			const w = await workspaceIpc.addWidget(entry.workspaceId, entry.widgetType);
			await workspaceIpc.updateWidgetPosition(
				w.id,
				entry.rect.x,
				entry.rect.y,
				entry.rect.w,
				entry.rect.h,
			);
			if (entry.config) {
				await workspaceIpc.updateWidgetConfig(w.id, entry.config);
			}
			// id が変わるので entry を update
			entry.widgetId = w.id;
		}
	} else if (entry.kind === 'remove') {
		if (direction === 'undo') {
			const w = await workspaceIpc.addWidget(entry.workspaceId, entry.widgetType);
			await workspaceIpc.updateWidgetPosition(
				w.id,
				entry.rect.x,
				entry.rect.y,
				entry.rect.w,
				entry.rect.h,
			);
			if (entry.config) {
				await workspaceIpc.updateWidgetConfig(w.id, entry.config);
			}
			entry.widgetId = w.id;
		} else {
			await workspaceIpc.removeWidget(entry.widgetId);
		}
	} else if (entry.kind === 'move' || entry.kind === 'resize') {
		const target = direction === 'undo' ? entry.before : entry.after;
		await workspaceIpc.updateWidgetPosition(entry.widgetId, target.x, target.y, target.w, target.h);
	} else if (entry.kind === 'config') {
		const target = direction === 'undo' ? entry.before : entry.after;
		await workspaceIpc.updateWidgetConfig(entry.widgetId, target);
	}
}

async function undo(reload?: () => Promise<void>): Promise<boolean> {
	if (undoStack.length === 0) return false;
	const entry = undoStack[undoStack.length - 1];
	try {
		await applyEntry(entry, 'undo');
		undoStack = undoStack.slice(0, -1);
		redoStack = [...redoStack, entry];
		await reload?.();
		return true;
	} catch (e) {
		console.error('[history] undo failed', e);
		return false;
	}
}

async function redo(reload?: () => Promise<void>): Promise<boolean> {
	if (redoStack.length === 0) return false;
	const entry = redoStack[redoStack.length - 1];
	try {
		await applyEntry(entry, 'redo');
		redoStack = redoStack.slice(0, -1);
		undoStack = [...undoStack, entry];
		await reload?.();
		return true;
	} catch (e) {
		console.error('[history] redo failed', e);
		return false;
	}
}

function clear() {
	undoStack = [];
	redoStack = [];
}

export const workspaceHistory = {
	get canUndo() {
		return undoStack.length > 0;
	},
	get canRedo() {
		return redoStack.length > 0;
	},
	get size() {
		return undoStack.length;
	},
	record,
	snapshotOf,
	undo,
	redo,
	clear,
};
