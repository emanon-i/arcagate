/**
 * PR-D: workspace.svelte.ts (666 LOC) を 3 sub-store に分割した widget CRUD 担当。
 *
 * 担当範囲:
 * - widget 一覧 (widgets)
 * - widget CRUD (load / add / addAt / bulkAdd / remove / config update / persistOrder / resize / move)
 * - 楽観 UI (optimisticResize / optimisticMoveAndResize / persistMoveAndResize / commitMoveAndResize)
 * - undo / redo (workspace-history.svelte.ts の ring buffer に entry を pop して IPC で逆/順方向適用)
 *
 * 引用元 guideline:
 * - a3-frontend-shape.md §2.2 (sub-store 分割: config / widgets / history)
 * - A2 SV-1 (Class wrapper + singleton export pattern)
 * - PH-issue-002 (Undo/Redo 5 種 mutation)
 * - PH-issue-003 (overlap 判定は widget-grid.ts の純粋関数に統一)
 *
 * 設計判断 (自分の判断で書いた箇所):
 * - `activeWorkspaceId` 参照は workspace-config を import して読み出す。
 *   ES modules の循環 import は load 時 ではなく runtime (method 実行時) に解決されるため、
 *   workspace-config が workspace-widgets.loadWidgets / setWidgets を呼ぶ片方向 + workspace-widgets が
 *   workspace-config.activeWorkspaceId を **method body 内**で読む構成で問題なし。
 */

import { getWatchedPaths, removeWatchedPath } from '$lib/ipc/watched_paths';
import * as workspaceIpc from '$lib/ipc/workspace';
import { toastStore } from '$lib/state/toast.svelte';
import { workspaceConfig } from '$lib/state/workspace-config.svelte';
import { type SimpleHistoryEntry, workspaceHistory } from '$lib/state/workspace-history.svelte';
import type { WidgetType, WorkspaceWidget } from '$lib/types/workspace';
import { getErrorMessage } from '$lib/utils/format-error';
import {
	findFreePosition,
	findFreePositionNear,
	type Rect,
	wouldOverlapAt,
} from '$lib/utils/widget-grid';
import { widgetRegistry } from '$lib/widgets';

/**
 * Phase 2 cascade (B 案 #16 完遂、2026-05-07):
 * exe_folder / projects widget の config から監視 path を抽出。
 * `watch_path` (exe_folder) と `watched_folder` (projects) の両方をサポート。
 */
function extractWatchedPathFromWidget(w: WorkspaceWidget): string | null {
	if (w.widget_type !== 'exe_folder' && w.widget_type !== 'projects') return null;
	if (!w.config) return null;
	try {
		const cfg = JSON.parse(w.config) as { watch_path?: string; watched_folder?: string };
		return cfg.watch_path ?? cfg.watched_folder ?? null;
	} catch {
		return null;
	}
}

/**
 * Phase 2 cascade: 削除対象 widget の path を、残存 widgets (active workspace 内) で
 * 誰も使ってないなら watched_paths から remove。
 *
 * cross-workspace の同 path は対象外: 別 workspace の widget が再 mount される際の
 * `ensureWatchedPath` が UNIQUE skip を経由せず再追加するため self-healing になる
 * (widgets/exe-folder/ExeFolderWatchWidget.svelte / projects/ProjectsWidget.svelte 参照)。
 */
async function cascadeRemoveWatchedPath(
	removed: WorkspaceWidget,
	remaining: WorkspaceWidget[],
): Promise<void> {
	const targetPath = extractWatchedPathFromWidget(removed);
	if (!targetPath) return;
	const stillUsed = remaining.some((w) => extractWatchedPathFromWidget(w) === targetPath);
	if (stillUsed) return;
	try {
		const list = await getWatchedPaths();
		const found = list.find((wp) => wp.path === targetPath);
		if (found) {
			await removeWatchedPath(found.id);
		}
	} catch (e) {
		// best-effort: cascade 失敗で widget 削除自体を中止しない (silent log)
		console.warn('cascadeRemoveWatchedPath failed', e);
	}
}

/**
 * 検収 #7: widget タイプごとの推奨デフォルトサイズを registry から取得する helper。
 * registry の `defaultSize` が無い場合は (2, 2) にフォールバック。
 */
function defaultSizeFor(type: WidgetType): { w: number; h: number } {
	return widgetRegistry[type]?.defaultSize ?? { w: 2, h: 2 };
}

/**
 * PH-issue-003: 配置 / 移動の overlap 判定は `$lib/utils/widget-grid` の純粋関数に統一。
 * 旧 (0,0) fallback バグ排除のため `findFreePosition` は null 返却版を使う。
 */
const DEFAULT_GRID_COLS = 4;
// 5/04 user 検収 (post-redo3 #4): MIN_PAN_ROWS と整合させ 128 に拡大。
// findFreePosition / addWidgetAt の row bound check は y + h <= DEFAULT_MAX_ROW + 1 (= 129)。
const DEFAULT_MAX_ROW = 128;

function widgetsToRects(list: WorkspaceWidget[], excludeId?: string): Rect[] {
	return list
		.filter((w) => (excludeId ? w.id !== excludeId : true))
		.map((w) => ({ x: w.position_x, y: w.position_y, w: w.width, h: w.height }));
}

class WorkspaceWidgets {
	widgets = $state<WorkspaceWidget[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);

	// PR-D Codex must-fix #1: workspace switching race protection。
	// 高速 selectWorkspace で古い loadWidgets レスポンスが新 workspace の widgets を上書きする
	// risk を防ぐため、request token で stale レスポンスを破棄する。
	private loadRequestId = 0;

	/** workspace-config から widgets 配列を直接差し替えるための internal setter (undo/redo 不要)。 */
	setWidgets(list: WorkspaceWidget[]): void {
		this.widgets = list;
	}

	async loadWidgets(workspaceId: string): Promise<void> {
		const myId = ++this.loadRequestId;
		this.loading = true;
		this.error = null;
		try {
			const list = await workspaceIpc.listWidgets(workspaceId);
			if (myId !== this.loadRequestId) return; // stale: より新しい load が走ったので破棄
			this.widgets = list;
			// 検収 #3: 新規 / 空 workspace は空のまま。default widget seed は撤廃 (user 自身が並べる)。
		} catch (e) {
			if (myId === this.loadRequestId) {
				this.error = getErrorMessage(e);
			}
		} finally {
			if (myId === this.loadRequestId) {
				this.loading = false;
			}
		}
	}

	async addWidget(
		widgetType: WidgetType,
		nearCell?: { x: number; y: number },
		cols?: number,
	): Promise<void> {
		const activeWorkspaceId = workspaceConfig.activeWorkspaceId;
		if (!activeWorkspaceId) return;
		this.loading = true;
		this.error = null;
		try {
			// 検収 #7: widget タイプ別 defaultSize (Clock 1x1 等の極小化を防止)。
			// Rust 側はサイズ 2x2 で row 末尾に作成するため、追加直後に widget タイプ別サイズに更新する。
			const { w, h } = defaultSizeFor(widgetType);
			// 検収 #5 + Codex Critical #1: nearCell 起点の **spiral 探索**。
			// 指定 cell が埋まっていたら top-left に飛ばず、最寄りの空きセルを spiral で探す
			// (top-left fallback は near が見つからない時のみ)。
			// Codex r3 #1 / r4 HIGH #1: viewport 幅から導出された responsive `cols` を **そのまま** 尊重。
			// 旧 `Math.max(DEFAULT_GRID_COLS, cols ?? DEFAULT_GRID_COLS)` は cols<4 の narrow viewport で
			// 強制的に 4 にしていたため、preview (dynamicCols=2 等) と判定が乖離する新たな mismatch を発生させていた。
			// 引数未指定時のみ DEFAULT_GRID_COLS にフォールバック。負/0 は最低 1 で sanity guard。
			const effectiveCols = Math.max(1, cols ?? DEFAULT_GRID_COLS);
			const rects = widgetsToRects(this.widgets);
			const pos = nearCell
				? findFreePositionNear(nearCell.x, nearCell.y, w, h, rects, effectiveCols, DEFAULT_MAX_ROW)
				: findFreePosition(w, h, rects, effectiveCols, DEFAULT_MAX_ROW);
			if (pos === null) {
				toastStore.add(
					'空きスペースがありません。既存ウィジェットを縮小・削除してください',
					'error',
				);
				return;
			}
			const widget = await workspaceIpc.addWidget(activeWorkspaceId, widgetType);
			await workspaceIpc.updateWidgetPosition(widget.id, pos.x, pos.y, w, h);
			widget.position_x = pos.x;
			widget.position_y = pos.y;
			widget.width = w;
			widget.height = h;
			this.widgets = [...this.widgets, widget];
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
			this.error = getErrorMessage(e);
		} finally {
			this.loading = false;
		}
	}

	async addWidgetAt(widgetType: WidgetType, x: number, y: number, cols?: number): Promise<void> {
		const activeWorkspaceId = workspaceConfig.activeWorkspaceId;
		if (!activeWorkspaceId) return;
		this.loading = true;
		this.error = null;
		try {
			// 検収 #7: widget タイプ別 defaultSize を使う。
			const { w, h } = defaultSizeFor(widgetType);
			// Codex r2 #2 + r3 #1 + r4 HIGH #1: grid 右端越え reject。preview と一致する `cols` を caller から
			// 受け取り、wide / narrow 両 canvas で同じ判定に。下限を 4 に強制すると narrow viewport
			// (dynamicCols<4) で preview と addWidgetAt の判定が乖離するため、`cols` を **そのまま** 採用する
			// (未指定時のみ DEFAULT_GRID_COLS、負/0 は最低 1 で sanity guard)。
			const effectiveCols = Math.max(1, cols ?? DEFAULT_GRID_COLS);
			if (x + w > effectiveCols || y + h > DEFAULT_MAX_ROW + 1) {
				toastStore.add('グリッド範囲外のため配置できません', 'error');
				return;
			}
			if (wouldOverlapAt(x, y, w, h, widgetsToRects(this.widgets))) {
				toastStore.add('他のウィジェットと重なるため配置できません', 'error');
				return;
			}
			const widget = await workspaceIpc.addWidget(activeWorkspaceId, widgetType);
			await workspaceIpc.updateWidgetPosition(widget.id, x, y, w, h);
			widget.position_x = x;
			widget.position_y = y;
			widget.width = w;
			widget.height = h;
			this.widgets = [...this.widgets, widget];
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
			this.error = getErrorMessage(e);
		} finally {
			this.loading = false;
		}
	}

	/**
	 * PH-issue-025 / Issue 8: 複数 itemId を一括で ItemWidget として配置。
	 * 1 つずつ findFreePosition で配置、overlap が解消できなくなったら toast でその時点までで停止。
	 * 戻り値: 実際に配置成功した個数。
	 */
	async bulkAddItemWidgets(itemIds: string[]): Promise<number> {
		const activeWorkspaceId = workspaceConfig.activeWorkspaceId;
		if (!activeWorkspaceId || itemIds.length === 0) return 0;
		this.loading = true;
		this.error = null;
		let placed = 0;
		try {
			for (const itemId of itemIds) {
				const { w, h } = defaultSizeFor('item');
				const pos = findFreePosition(
					w,
					h,
					widgetsToRects(this.widgets),
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
				this.widgets = [...this.widgets, updated];
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
			this.error = getErrorMessage(e);
		} finally {
			this.loading = false;
		}
		return placed;
	}

	async removeWidget(id: string): Promise<void> {
		this.loading = true;
		this.error = null;
		const target = this.widgets.find((w) => w.id === id);
		const wsId = workspaceConfig.activeWorkspaceId;
		try {
			await workspaceIpc.removeWidget(id);
			const remaining = this.widgets.filter((w) => w.id !== id);
			this.widgets = remaining;
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
			// Phase 2 cascade (B 案 #16 完遂): exe_folder / projects widget が削除されたら
			// 同 path を使う他 widget が active workspace に無ければ watched_paths も解除。
			if (target) {
				await cascadeRemoveWatchedPath(target, remaining);
			}
		} catch (e) {
			this.error = getErrorMessage(e);
		} finally {
			this.loading = false;
		}
	}

	/**
	 * H-2 Tier B (2026-05-09 user 検収): 複数 widget をまとめて削除し、history を 1 batch entry
	 * として記録。Ctrl+Z 1 回で N 件全部復活する UX。
	 */
	async removeMany(ids: string[]): Promise<void> {
		if (ids.length === 0) return;
		if (ids.length === 1) {
			// 単件は既存 path で record (snackbar 動作も維持)。
			await this.removeWidget(ids[0]);
			return;
		}
		this.loading = true;
		this.error = null;
		const wsId = workspaceConfig.activeWorkspaceId;
		const targets = ids
			.map((id) => this.widgets.find((w) => w.id === id))
			.filter((w): w is WorkspaceWidget => w !== undefined);
		try {
			for (const t of targets) {
				await workspaceIpc.removeWidget(t.id);
			}
			const removedSet = new Set(targets.map((t) => t.id));
			const remaining = this.widgets.filter((w) => !removedSet.has(w.id));
			this.widgets = remaining;
			if (wsId) {
				const entries: SimpleHistoryEntry[] = targets.map((t) => ({
					kind: 'remove',
					workspaceId: wsId,
					widgetId: t.id,
					widgetType: t.widget_type,
					rect: { x: t.position_x, y: t.position_y, w: t.width, h: t.height },
					config: t.config,
				}));
				workspaceHistory.record({ kind: 'batch', entries });
			}
			// cascade: 各 removed widget について watched path 解除を試みる
			for (const t of targets) {
				await cascadeRemoveWatchedPath(t, remaining);
			}
		} catch (e) {
			this.error = getErrorMessage(e);
		} finally {
			this.loading = false;
		}
	}

	async persistWidgetOrder(orderedWidgets: WorkspaceWidget[]): Promise<void> {
		try {
			await Promise.all(
				orderedWidgets.map((w, i) =>
					workspaceIpc.updateWidgetPosition(w.id, w.position_x, i, w.width, w.height),
				),
			);
			this.widgets = orderedWidgets.map((w, i) => ({ ...w, position_y: i }));
		} catch (e) {
			this.error = getErrorMessage(e);
		}
	}

	async updateWidgetConfig(id: string, config: string | null): Promise<void> {
		const before = this.widgets.find((w) => w.id === id)?.config ?? null;
		try {
			this.error = null;
			const updated = await workspaceIpc.updateWidgetConfig(id, config);
			this.widgets = this.widgets.map((w) => (w.id === id ? updated : w));
			// PH-issue-002: history record (config 変更)
			if (before !== config) {
				workspaceHistory.record({ kind: 'config', widgetId: id, before, after: config });
			}
		} catch (e) {
			this.error = getErrorMessage(e);
		}
	}

	async resizeWidget(id: string, width: number, height: number): Promise<void> {
		const target = this.widgets.find((w) => w.id === id);
		if (!target) return;
		try {
			this.error = null;
			await workspaceIpc.updateWidgetPosition(
				id,
				target.position_x,
				target.position_y,
				width,
				height,
			);
			this.widgets = this.widgets.map((w) => (w.id === id ? { ...w, width, height } : w));
		} catch (e) {
			this.error = getErrorMessage(e);
		}
	}

	async moveWidget(id: string, x: number, y: number, cols?: number): Promise<void> {
		const target = this.widgets.find((w) => w.id === id);
		if (!target) return;
		this.error = null;

		const before = {
			x: target.position_x,
			y: target.position_y,
			w: target.width,
			h: target.height,
		};

		// Codex r4 HIGH #2: drop preview は overflowsRight / 下端越えを blocked 表示するが、
		// pointerup で moveWidget を呼ぶ経路に bound check が無いと「赤プレビュー」のまま
		// commit して overflow 位置が DB に永続化される (UI と論理の乖離)。
		// → addWidgetAt と同一の bound check を caller の dynamicCols 付きで実行する。
		// Codex r5 HIGH #1: narrow viewport (dynamicCols<4) でも preview と一致させるため、
		// `cols` をそのまま採用 (旧 Math.max(4, ...) は同じ class の mismatch を発生させていた)。
		const effectiveCols = Math.max(1, cols ?? DEFAULT_GRID_COLS);
		if (
			x < 0 ||
			y < 0 ||
			x + target.width > effectiveCols ||
			y + target.height > DEFAULT_MAX_ROW + 1
		) {
			toastStore.add('グリッド範囲外のため移動できません', 'error');
			return;
		}

		// PH-issue-003: 移動先 overlap なら拒否 + toast、auto-rearrange 廃止
		// (user fb 「単純に重ならない」)。
		const others = widgetsToRects(this.widgets, id);
		if (wouldOverlapAt(x, y, target.width, target.height, others)) {
			toastStore.add('他のウィジェットと重なるため移動できません', 'error');
			return;
		}

		// Optimistic local update
		this.widgets = this.widgets.map((w) =>
			w.id === id ? { ...w, position_x: x, position_y: y } : w,
		);
		try {
			await workspaceIpc.updateWidgetPosition(id, x, y, target.width, target.height);
			// PH-issue-002: history record (move) — 位置変化があれば積む
			const after = { x, y, w: target.width, h: target.height };
			if (before.x !== after.x || before.y !== after.y) {
				workspaceHistory.record({ kind: 'move', widgetId: id, before, after });
			}
		} catch (e) {
			this.error = getErrorMessage(e);
			// PR-D Codex must-fix #3: rollback で別 mutation の最新値を上書きしない (lost-update 防止)。
			// IPC await 中に同 widget 対する別 moveWidget が完了している場合、その値を保持する。
			// optimistic 値 (x, y) と一致する場合のみ rollback、変化していたら skip。
			const current = this.widgets.find((w) => w.id === id);
			if (current && current.position_x === x && current.position_y === y) {
				this.widgets = this.widgets.map((w) =>
					w.id === id ? { ...w, position_x: target.position_x, position_y: target.position_y } : w,
				);
			}
		}
	}

	/**
	 * H-2 Tier B (2026-05-09 user 検収): 複数 widget を同 delta で同時移動 + history 1 batch。
	 * 全 target が grid 範囲内かつ非選択 widget と overlap しない場合のみ commit、
	 * 1 件でも違反すれば全体を reject (atomic) + toast 表示。
	 */
	async moveMany(moves: { id: string; toX: number; toY: number }[], cols?: number): Promise<void> {
		if (moves.length === 0) return;
		if (moves.length === 1) {
			const m = moves[0];
			await this.moveWidget(m.id, m.toX, m.toY, cols);
			return;
		}
		this.error = null;
		const targets = moves.map((m) => {
			const w = this.widgets.find((x) => x.id === m.id);
			return w ? { src: w, toX: m.toX, toY: m.toY } : null;
		});
		if (targets.some((t) => t === null)) return;
		const ts = targets as Array<{ src: WorkspaceWidget; toX: number; toY: number }>;

		const effectiveCols = Math.max(1, cols ?? DEFAULT_GRID_COLS);
		// 1) 範囲内チェック
		for (const t of ts) {
			if (
				t.toX < 0 ||
				t.toY < 0 ||
				t.toX + t.src.width > effectiveCols ||
				t.toY + t.src.height > DEFAULT_MAX_ROW + 1
			) {
				toastStore.add('グリッド範囲外のため移動できません', 'error');
				return;
			}
		}
		// 2) overlap チェック (移動 widget 群同士の衝突 + 非移動 widget との衝突)
		const movingIds = new Set(ts.map((t) => t.src.id));
		const stationaryRects = this.widgets
			.filter((w) => !movingIds.has(w.id))
			.map((w) => ({ x: w.position_x, y: w.position_y, w: w.width, h: w.height }));
		// 各 target が stationary と衝突しないか
		for (const t of ts) {
			if (wouldOverlapAt(t.toX, t.toY, t.src.width, t.src.height, stationaryRects)) {
				toastStore.add('他のウィジェットと重なるため移動できません', 'error');
				return;
			}
		}
		// 移動先同士の衝突
		const targetRects = ts.map((t) => ({ x: t.toX, y: t.toY, w: t.src.width, h: t.src.height }));
		for (let i = 0; i < targetRects.length; i++) {
			const cur = targetRects[i];
			const others = targetRects.filter((_, j) => j !== i);
			if (wouldOverlapAt(cur.x, cur.y, cur.w, cur.h, others)) {
				toastStore.add('選択 widget 同士が重なるため移動できません', 'error');
				return;
			}
		}

		// Optimistic local update
		const updateMap = new Map(ts.map((t) => [t.src.id, { x: t.toX, y: t.toY }]));
		this.widgets = this.widgets.map((w) => {
			const u = updateMap.get(w.id);
			return u ? { ...w, position_x: u.x, position_y: u.y } : w;
		});
		try {
			for (const t of ts) {
				await workspaceIpc.updateWidgetPosition(t.src.id, t.toX, t.toY, t.src.width, t.src.height);
			}
			const moveEntries: SimpleHistoryEntry[] = ts
				.filter((t) => t.src.position_x !== t.toX || t.src.position_y !== t.toY)
				.map((t) => ({
					kind: 'move',
					widgetId: t.src.id,
					before: {
						x: t.src.position_x,
						y: t.src.position_y,
						w: t.src.width,
						h: t.src.height,
					},
					after: { x: t.toX, y: t.toY, w: t.src.width, h: t.src.height },
				}));
			if (moveEntries.length > 0) {
				workspaceHistory.record({ kind: 'batch', entries: moveEntries });
			}
		} catch (e) {
			this.error = getErrorMessage(e);
			// IPC 失敗時 rollback (全 target 戻す)
			this.widgets = this.widgets.map((w) => {
				const t = ts.find((x) => x.src.id === w.id);
				return t ? { ...w, position_x: t.src.position_x, position_y: t.src.position_y } : w;
			});
		}
	}

	optimisticResize(id: string, width: number, height: number): void {
		this.widgets = this.widgets.map((w) => (w.id === id ? { ...w, width, height } : w));
	}

	optimisticMoveAndResize(id: string, x: number, y: number, width: number, height: number): void {
		this.widgets = this.widgets.map((w) =>
			w.id === id ? { ...w, position_x: x, position_y: y, width, height } : w,
		);
	}

	async persistMoveAndResize(
		id: string,
		x: number,
		y: number,
		width: number,
		height: number,
	): Promise<void> {
		try {
			await workspaceIpc.updateWidgetPosition(id, x, y, width, height);
		} catch (e) {
			this.error = getErrorMessage(e);
			const activeWorkspaceId = workspaceConfig.activeWorkspaceId;
			if (activeWorkspaceId) {
				await this.loadWidgets(activeWorkspaceId);
			}
		}
	}

	/**
	 * PH-issue-002: history 記録付きの move/resize commit (pointerup タイミングで呼ぶ)。
	 * before snapshot を呼出側で渡し、確定後に history に積む。
	 */
	async commitMoveAndResize(
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
			this.error = getErrorMessage(e);
			const activeWorkspaceId = workspaceConfig.activeWorkspaceId;
			if (activeWorkspaceId) {
				await this.loadWidgets(activeWorkspaceId);
			}
		}
	}

	/**
	 * H-2 Tier B: 単一 entry の undo 適用 (batch 内 entry も同じ logic で逆向き適用)。
	 */
	private async applySimpleUndo(
		entry: SimpleHistoryEntry,
		activeWorkspaceId: string,
	): Promise<void> {
		switch (entry.kind) {
			case 'add': {
				await workspaceIpc.removeWidget(entry.widgetId);
				this.widgets = this.widgets.filter((w) => w.id !== entry.widgetId);
				break;
			}
			case 'remove': {
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
				entry.widgetId = widget.id;
				await this.loadWidgets(activeWorkspaceId);
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
				this.widgets = this.widgets.map((w) =>
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
				this.widgets = this.widgets.map((w) =>
					w.id === entry.widgetId ? { ...w, config: entry.before } : w,
				);
				break;
			}
		}
	}

	/** PH-issue-002: Undo — 履歴 1 件を逆方向に IPC で適用、ローカル state も更新 */
	async undo(): Promise<void> {
		const entry = workspaceHistory.popUndo();
		const activeWorkspaceId = workspaceConfig.activeWorkspaceId;
		if (!entry || !activeWorkspaceId) return;
		this.error = null;
		// R8-3: undo が走った時点で削除 snackbar は役割終了 (Ctrl+Z でも snackbar click でも同じ経路)
		workspaceHistory.dismiss();
		try {
			if (entry.kind === 'batch') {
				// H-2 Tier B: 逆順で適用 (記録時の順序で undo すると重ね合わせが崩れるため)
				for (let i = entry.entries.length - 1; i >= 0; i--) {
					await this.applySimpleUndo(entry.entries[i], activeWorkspaceId);
				}
			} else {
				await this.applySimpleUndo(entry, activeWorkspaceId);
			}
		} catch (e) {
			this.error = getErrorMessage(e);
			await this.loadWidgets(activeWorkspaceId);
		}
	}

	/** PH-issue-002: Redo — 履歴 1 件を順方向に再適用 */
	async redo(): Promise<void> {
		const entry = workspaceHistory.popRedo();
		const activeWorkspaceId = workspaceConfig.activeWorkspaceId;
		if (!entry || !activeWorkspaceId) return;
		this.error = null;
		try {
			if (entry.kind === 'batch') {
				// H-2 Tier B: 順方向で適用
				for (const sub of entry.entries) {
					await this.applySimpleRedo(sub, activeWorkspaceId);
				}
			} else {
				await this.applySimpleRedo(entry, activeWorkspaceId);
			}
		} catch (e) {
			this.error = getErrorMessage(e);
			await this.loadWidgets(activeWorkspaceId);
		}
	}

	/**
	 * H-2 Tier B: 単一 entry の redo 適用 (batch 内 entry も同じ logic で順方向適用)。
	 */
	private async applySimpleRedo(
		entry: SimpleHistoryEntry,
		activeWorkspaceId: string,
	): Promise<void> {
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
				entry.widgetId = widget.id;
				await this.loadWidgets(activeWorkspaceId);
				break;
			}
			case 'remove': {
				await workspaceIpc.removeWidget(entry.widgetId);
				this.widgets = this.widgets.filter((w) => w.id !== entry.widgetId);
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
				this.widgets = this.widgets.map((w) =>
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
				this.widgets = this.widgets.map((w) =>
					w.id === entry.widgetId ? { ...w, config: entry.after } : w,
				);
				break;
			}
		}
	}
}

export const workspaceWidgets = new WorkspaceWidgets();
