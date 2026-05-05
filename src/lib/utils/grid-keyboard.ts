/**
 * Grid / list 表示の keyboard nav 純関数。
 *
 * ArrowUp/Down/Left/Right + Home/End + Enter/Escape/Space を処理し、
 * 次の focus index と発火する action (launch / toggleSelect / dismiss / focus) を返す。
 *
 * spec: docs/l1_requirements/library-overhaul/phase-l2-plan.md L2-B
 *
 * caller (LibraryMainArea) は IME 確定中 (e.isComposing) に呼ばないこと。
 */

export type GridKeyAction =
	| { type: 'focus'; index: number }
	| { type: 'launch'; index: number }
	| { type: 'toggleSelect'; index: number }
	| { type: 'edit'; index: number }
	| { type: 'delete'; index: number }
	| { type: 'selectAll' }
	| { type: 'dismiss' }
	| { type: 'noop' };

export interface GridKeyArgs {
	key: string;
	currentIndex: number; // -1 = no focus yet
	total: number;
	cols: number; // 1 for list view
	selectionMode: boolean;
	/** Cmd / Ctrl modifier (for Ctrl+A / Cmd+A). */
	mod?: boolean;
}

export function gridKeyboardNav(args: GridKeyArgs): GridKeyAction {
	const { key, currentIndex, total, cols, selectionMode, mod } = args;
	if (total === 0) return { type: 'noop' };
	const safeCols = Math.max(1, Math.floor(cols));
	const safeCurrent = currentIndex >= 0 && currentIndex < total ? currentIndex : 0;

	// 矢印で focus が無い状態 (-1) からの初回押下は先頭にフォーカス
	const startIfUnfocused = currentIndex < 0 ? 0 : safeCurrent;

	// Ctrl/Cmd 修飾キー組み合わせ (a / A だけ受ける、他は noop)
	if (mod) {
		if (key === 'a' || key === 'A') return { type: 'selectAll' };
		return { type: 'noop' };
	}

	switch (key) {
		case 'ArrowRight':
			return { type: 'focus', index: clamp(startIfUnfocused + 1, 0, total - 1) };
		case 'ArrowLeft':
			return { type: 'focus', index: clamp(startIfUnfocused - 1, 0, total - 1) };
		case 'ArrowDown':
			return { type: 'focus', index: clamp(startIfUnfocused + safeCols, 0, total - 1) };
		case 'ArrowUp':
			return { type: 'focus', index: clamp(startIfUnfocused - safeCols, 0, total - 1) };
		case 'Home':
			return { type: 'focus', index: 0 };
		case 'End':
			return { type: 'focus', index: total - 1 };
		case 'Enter': {
			if (currentIndex < 0) return { type: 'noop' };
			return selectionMode
				? { type: 'toggleSelect', index: currentIndex }
				: { type: 'launch', index: currentIndex };
		}
		case ' ':
		case 'Spacebar':
			if (currentIndex < 0 || !selectionMode) return { type: 'noop' };
			return { type: 'toggleSelect', index: currentIndex };
		case 'Delete':
		case 'Backspace':
			if (currentIndex < 0) return { type: 'noop' };
			return { type: 'delete', index: currentIndex };
		case 'F3':
			if (currentIndex < 0) return { type: 'noop' };
			return { type: 'edit', index: currentIndex };
		case 'Escape':
			return { type: 'dismiss' };
		default:
			return { type: 'noop' };
	}
}

function clamp(n: number, min: number, max: number): number {
	if (max < min) return min;
	return Math.max(min, Math.min(max, n));
}

/**
 * 描画後の grid element から column 数を測る。
 *
 * - `grid-template-columns` の値を split で数える (auto-fill / repeat 展開済前提、
 *   getComputedStyle が browser で展開する)
 * - element 不在 / 計算前は 1 を返す (list view 想定)
 */
export function detectGridCols(el: HTMLElement | null | undefined): number {
	if (!el) return 1;
	const tpl = getComputedStyle(el).gridTemplateColumns;
	if (!tpl || tpl === 'none') return 1;
	// "200px 200px 200px" → 3、"200px" → 1
	const tokens = tpl.split(/\s+/).filter((t) => t.length > 0);
	return Math.max(1, tokens.length);
}
