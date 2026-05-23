/**
 * PH-CF-200: workspace への OS ファイルドロップ座標 → grid cell 変換と、
 * 非同期ドロップ処理中の page 固定 (= active workspace pin) を担う小さな store。
 *
 * 背景:
 * - Tauri v2.11 の `tauri://drag-drop` は `position: PhysicalPosition` を payload に持つ
 *   (ドキュメント / `@tauri-apps/api/webview.d.ts` の `DragDropEvent` 参照)。
 *   旧コメント (`+page.svelte:272`) の「座標を持たない」 は API 進化前の前提で誤り。
 * - 配置ロジック (`workspace-widgets.svelte.ts`) は drop 座標を直接知らないため、
 *   この store が「現在の workspace canvas の drop zone」 を保持し、 座標 → cell 変換を
 *   一手に引き受ける。 `WorkspaceWidgetGrid` が mount 時に dropZone を登録する。
 * - 非同期 drop 処理 (`addImageScrapWidget` 等が backend `cmd_save_image_scrap` を await) の
 *   途中で user がタブ (workspace) を切り替えた場合、 widget は **ドロップ開始時の workspace**
 *   に配置されるべき (Codex review 指摘)。 そのため `pin` / `clearPin` で activeWorkspaceId を
 *   ドロップ開始時に snapshot する。
 *
 * 引用元 guideline:
 * - `docs/l3_phases/clean-feedback/PH-CF-200_workspace-dnd-placement.md` §スコープ / §タスク 1, 2, 5
 * - `docs/l2_foundation/features/screens/workspace.md` §D&D 配置契約
 */

import { cellFromClient, cellFromPhysicalPosition } from '$lib/utils/drop-coords';

export interface DropZoneDimensions {
	widgetW: number;
	widgetH: number;
	dynamicCols: number;
	maxRow: number;
}

class WorkspaceDropCoords {
	private dropZoneEl: HTMLElement | null = null;
	private dims: DropZoneDimensions = { widgetW: 0, widgetH: 0, dynamicCols: 0, maxRow: 0 };
	private viewportCenterCellGetter: (() => { x: number; y: number } | null) | null = null;

	/**
	 * ドロップ開始時の active workspace id を snapshot。 非同期 drop 処理完了まで保持し、
	 * 配置先 workspace を pin する。 タブ切替で active が変わっても、 配置はこの id へ。
	 */
	pinnedWorkspaceId = $state<string | null>(null);

	/** WorkspaceWidgetGrid mount 時に drop zone element + grid 寸法を登録。 unmount で null。 */
	registerDropZone(el: HTMLElement | null, dims: DropZoneDimensions): void {
		this.dropZoneEl = el;
		this.dims = dims;
	}

	/**
	 * WorkspaceLayout mount 時に viewport 中央 cell の getter を登録。
	 * `+page.svelte` の OS drop handler が drop zone 外 fallback として使う。
	 * unmount 時は null で解除。
	 */
	registerViewportCenterCellGetter(getter: (() => { x: number; y: number } | null) | null): void {
		this.viewportCenterCellGetter = getter;
	}

	getViewportCenterCell(): { x: number; y: number } | null {
		return this.viewportCenterCellGetter?.() ?? null;
	}

	/** dynamicCols (`+page.svelte` の addWidget opts に渡す用)。 未登録時は 0。 */
	get dynamicCols(): number {
		return this.dims.dynamicCols;
	}

	/** ドロップ開始時に workspaceId を pin。 同 id を 2 度 pin しても上書きで safe。 */
	pin(workspaceId: string): void {
		this.pinnedWorkspaceId = workspaceId;
	}

	clearPin(): void {
		this.pinnedWorkspaceId = null;
	}

	/** drop zone 未登録 / 座標範囲外なら null (caller は viewport 中心 fallback を使う)。 */
	private geometry(): {
		rect: { left: number; top: number };
		widgetW: number;
		widgetH: number;
		dynamicCols: number;
		maxRow: number;
	} | null {
		if (!this.dropZoneEl) return null;
		const r = this.dropZoneEl.getBoundingClientRect();
		return {
			rect: { left: r.left, top: r.top },
			widgetW: this.dims.widgetW,
			widgetH: this.dims.widgetH,
			dynamicCols: this.dims.dynamicCols,
			maxRow: this.dims.maxRow,
		};
	}

	/** Tauri `PhysicalPosition` (device px) → grid cell。 */
	cellFromPhysicalPosition(pos: { x: number; y: number }): { x: number; y: number } | null {
		const geom = this.geometry();
		if (!geom) return null;
		const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
		return cellFromPhysicalPosition(pos, dpr, geom);
	}

	/** viewport-relative CSS px (clientX/Y) → grid cell。 */
	cellFromClient(clientX: number, clientY: number): { x: number; y: number } | null {
		const geom = this.geometry();
		if (!geom) return null;
		return cellFromClient(clientX, clientY, geom);
	}
}

export const workspaceDropCoords = new WorkspaceDropCoords();
