/**
 * PH-issue-002: Workspace 編集 history (Undo/Redo) — 5 種 mutation を 50 件 ring buffer で保持。
 *
 * 引用元 guideline:
 * - docs/desktop_ui_ux_agent_rules.md P2 (失敗前提、Undo で立て直す) / P10 (熟練者効率)
 * - docs/l1_requirements/ux_standards.md §13 Workspace Canvas 編集 UX
 * - HICCUPPS [Image, User]: OS / Office / Adobe / Figma の Ctrl+Z 標準
 *
 * 構造:
 * - HistoryEntry 5 種: add / remove / move / resize / config
 * - undo() / redo() は entry を逆方向 / 順方向に IPC で適用
 * - 50 件上限、超過時は古いものから drop
 * - undo 後に新 mutation すると redo stack を破棄 (linear history)
 */

import type { WidgetType } from '$lib/types/workspace';

export type WidgetRect = { x: number; y: number; w: number; h: number };

export type HistoryEntry =
	| {
			kind: 'add';
			workspaceId: string;
			widgetId: string;
			widgetType: WidgetType;
			rect: WidgetRect;
			config: string | null;
	  }
	| {
			kind: 'remove';
			workspaceId: string;
			widgetId: string;
			widgetType: WidgetType;
			rect: WidgetRect;
			config: string | null;
	  }
	| { kind: 'move'; widgetId: string; before: WidgetRect; after: WidgetRect }
	| { kind: 'resize'; widgetId: string; before: WidgetRect; after: WidgetRect }
	| { kind: 'config'; widgetId: string; before: string | null; after: string | null };

const MAX_HISTORY = 50;

const undoStack = $state<HistoryEntry[]>([]);
const redoStack = $state<HistoryEntry[]>([]);

function record(entry: HistoryEntry) {
	undoStack.push(entry);
	if (undoStack.length > MAX_HISTORY) undoStack.shift();
	redoStack.length = 0;
}

function popUndo(): HistoryEntry | null {
	const entry = undoStack.pop();
	if (entry) redoStack.push(entry);
	return entry ?? null;
}

function popRedo(): HistoryEntry | null {
	const entry = redoStack.pop();
	if (entry) undoStack.push(entry);
	return entry ?? null;
}

function clear() {
	undoStack.length = 0;
	redoStack.length = 0;
}

export const workspaceHistory = {
	get canUndo() {
		return undoStack.length > 0;
	},
	get canRedo() {
		return redoStack.length > 0;
	},
	get undoSize() {
		return undoStack.length;
	},
	get redoSize() {
		return redoStack.length;
	},
	record,
	popUndo,
	popRedo,
	clear,
};
