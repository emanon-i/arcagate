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

import { WIDGET_LABELS, type WidgetType } from '$lib/types/workspace';

export type WidgetRect = { x: number; y: number; w: number; h: number };

// H-2 Tier B (2026-05-09): SimpleHistoryEntry は単一操作。BatchHistoryEntry が複数操作を
// まとめて 1 step undo / redo するために導入。複数 widget の同時 move / 同時 delete を
// user の「Ctrl+Z 1 回で全部戻る」 期待に揃える。
export type SimpleHistoryEntry =
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

export type BatchHistoryEntry = {
	kind: 'batch';
	entries: SimpleHistoryEntry[];
};

export type HistoryEntry = SimpleHistoryEntry | BatchHistoryEntry;

const MAX_HISTORY = 50;

const undoStack = $state<HistoryEntry[]>([]);
const redoStack = $state<HistoryEntry[]>([]);

/**
 * R8-3: widget delete 後 5 秒間表示する snackbar 用 pending 状態。
 * libraryHistory.pendingUndo と同型 (UX 一貫性)。
 *
 * 'remove' エントリを `record` した時のみ立つ。move/resize/config では立たない
 * (ユーザが「削除」を意識した瞬間のみ可視 feedback を出すのが目的)。
 */
const UNDO_TTL_MS = 5_000;

interface PendingDelete {
	widgetType: WidgetType;
	widgetLabel: string;
	expiresAt: number;
	seq: number;
}

let pendingDelete = $state<PendingDelete | null>(null);
let dismissTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSeq = 0;

function clearPending() {
	pendingDelete = null;
	if (dismissTimer) {
		clearTimeout(dismissTimer);
		dismissTimer = null;
	}
}

function setPendingDelete(widgetType: WidgetType) {
	if (dismissTimer) clearTimeout(dismissTimer);
	pendingDelete = {
		widgetType,
		widgetLabel: WIDGET_LABELS[widgetType] ?? widgetType,
		expiresAt: Date.now() + UNDO_TTL_MS,
		seq: ++pendingSeq,
	};
	dismissTimer = setTimeout(() => {
		pendingDelete = null;
		dismissTimer = null;
	}, UNDO_TTL_MS);
}

function record(entry: HistoryEntry) {
	undoStack.push(entry);
	if (undoStack.length > MAX_HISTORY) undoStack.shift();
	redoStack.length = 0;
	if (entry.kind === 'remove') {
		setPendingDelete(entry.widgetType);
	}
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
	clearPending();
}

function dismiss(): void {
	clearPending();
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
	get pendingUndo() {
		return pendingDelete;
	},
	record,
	popUndo,
	popRedo,
	clear,
	dismiss,
};
