/**
 * PH-CF-200: OS file drop の座標 → grid cell 変換 (pure 計算)。
 *
 * `workspace-drop-coords.svelte.ts` は state (`$state`) + dropZone ref を持つため
 * vitest からそのまま import すると `$state is not defined` で fail する。
 * 計算 logic だけ pure 関数として切り出して test 可能にする。
 *
 * 計算は `WorkspaceWidgetGrid.svelte` の `calcDropCell` と同一:
 *   relX = clientX - dropZoneRect.left
 *   relY = clientY - dropZoneRect.top
 *   cellW = widgetW + GRID_GAP (16)
 *   cellH = widgetH + GRID_GAP (16)
 *   cellX = floor(relX / cellW), cellY = floor(relY / cellH)
 *   範囲外 (relX/relY 負 / cellX>=dynamicCols / cellY>=maxRow) → null
 *
 * zoom / scroll / pan は drop zone 自体が canvas scroll の子で `getBoundingClientRect()`
 * が最新値を返すため自動的に反映される (rect.left / rect.top が viewport-relative)。
 *
 * 引用元 guideline:
 * - `docs/l3_phases/clean-feedback/PH-CF-200_workspace-dnd-placement.md` §タスク 2
 */

const GRID_GAP = 16;

export interface DropZoneGeometry {
	rect: { left: number; top: number };
	widgetW: number;
	widgetH: number;
	dynamicCols: number;
	maxRow: number;
}

/**
 * viewport-relative CSS px (clientX/Y) を grid cell に変換。 範囲外なら null。
 * 寸法が 0 / 負 / NaN なら null (drop zone 未登録の sentinel)。
 */
export function cellFromClient(
	clientX: number,
	clientY: number,
	geom: DropZoneGeometry,
): { x: number; y: number } | null {
	const { rect, widgetW, widgetH, dynamicCols, maxRow } = geom;
	if (widgetW <= 0 || widgetH <= 0 || dynamicCols <= 0 || maxRow <= 0) return null;
	const relX = clientX - rect.left;
	const relY = clientY - rect.top;
	if (relX < 0 || relY < 0) return null;
	const cellW = widgetW + GRID_GAP;
	const cellH = widgetH + GRID_GAP;
	const x = Math.floor(relX / cellW);
	const y = Math.floor(relY / cellH);
	if (x >= dynamicCols || y >= maxRow) return null;
	return { x, y };
}

/**
 * Tauri `PhysicalPosition` (device pixel) を CSS pixel に正規化してから
 * `cellFromClient` に委譲。
 */
export function cellFromPhysicalPosition(
	pos: { x: number; y: number },
	devicePixelRatio: number,
	geom: DropZoneGeometry,
): { x: number; y: number } | null {
	const dpr = devicePixelRatio > 0 ? devicePixelRatio : 1;
	return cellFromClient(pos.x / dpr, pos.y / dpr, geom);
}
