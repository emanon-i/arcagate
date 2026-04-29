import { configStore } from '$lib/state/config.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';

// PH-issue-004: グリッドセル base size を 320×180 → 240×135 に縮小 (16:9 維持)。
// 1280×800 viewport で旧 4×4=16 セル → 新 5×5=25 セル の表示密度向上。
// zoom 50% で 120×67 (極小、長文 widget は実用外)、zoom 200% で 480×270 (大画面用)。
const BASE_W = 240;
const BASE_H = 135;

const MIN_ZOOM = 50;
const MAX_ZOOM = 200;
const RESET_ZOOM = 100;

/**
 * PH-issue-002: zoom + Shift+wheel 横 pan + Fit to content + Reset.
 *
 * 引用元 guideline:
 * - docs/desktop_ui_ux_agent_rules.md P5 (OS 文脈、Obsidian / Figma 慣習)
 * - docs/l1_requirements/ux_design_vision.md §2-3 (Responsive 100ms / Consistent)
 * - docs/l1_requirements/ux_standards.md §13 Workspace Canvas 編集 UX
 *
 * 入力マッピング:
 * - Ctrl + wheel: zoom (±10、50〜200%)
 * - Shift + wheel: 横 scroll (左右 pan)
 * - 通常 wheel: 縦 scroll (ブラウザ標準、handler 介入なし)
 */
export function useWidgetZoom(containerRef: () => HTMLElement | null) {
	const widgetW = $derived(Math.round(BASE_W * (configStore.widgetZoom / 100)));
	const widgetH = $derived(Math.round(BASE_H * (configStore.widgetZoom / 100)));

	function handleWheel(e: WheelEvent) {
		const el = containerRef();
		if (!el) return;
		if (e.ctrlKey) {
			// Ctrl+wheel: zoom
			e.preventDefault();
			const delta = e.deltaY > 0 ? -10 : 10;
			configStore.setWidgetZoom(
				Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, configStore.widgetZoom + delta)),
			);
		} else if (e.shiftKey) {
			// Shift+wheel: 横 scroll (Figma / Miro 標準)
			e.preventDefault();
			el.scrollLeft += e.deltaY;
		}
		// 通常 wheel: 縦 scroll はブラウザ標準に任せる
	}

	$effect(() => {
		const el = containerRef();
		if (!el) return;
		el.addEventListener('wheel', handleWheel, { passive: false });
		return () => el.removeEventListener('wheel', handleWheel);
	});

	function resetZoom() {
		configStore.setWidgetZoom(RESET_ZOOM);
	}

	function setZoom(value: number) {
		configStore.setWidgetZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value)));
	}

	/**
	 * PH-issue-040 / 検収項目 #10: Fit to content 改修。
	 *
	 * 全 widget の bounding box が現在の window viewport に収まるよう zoom + scroll 調整。
	 * 旧実装は scroll を (0,0) にしていたため、PH-issue-034 (infinite canvas、padding 2000px)
	 * 導入後は widgets が画面外のまま見えないバグ。
	 *
	 * - BB を min/max で計算 (widgets が左上から始まらない場合も対応)
	 * - zoom 比率は `availW / BB_W`, `availH / BB_H` の min
	 * - scroll は BB を viewport 中央に置く位置に
	 * - widgets が空なら resetZoom + 初期 scroll (1900, 1900) に戻す
	 */
	function fitToContent(widgets: WorkspaceWidget[]) {
		const el = containerRef();
		if (!el) return;
		if (widgets.length === 0) {
			resetZoom();
			el.scrollTo({ left: 3900, top: 3900, behavior: 'instant' });
			return;
		}
		const minX = widgets.reduce((m, w) => Math.min(m, w.position_x), Infinity);
		const minY = widgets.reduce((m, w) => Math.min(m, w.position_y), Infinity);
		const maxX = widgets.reduce((m, w) => Math.max(m, w.position_x + w.width), 0);
		const maxY = widgets.reduce((m, w) => Math.max(m, w.position_y + w.height), 0);
		const cols = maxX - minX;
		const rows = maxY - minY;
		if (cols <= 0 || rows <= 0) {
			resetZoom();
			return;
		}

		const gap = 16;
		// 検収 #10: 上の PageTabBar (~52px) と右下 toolbar (~48px) で widget が被るのを防ぐため
		// 上下に十分な breathing room を取る (toolbar 高さ + 余白)。
		const TOP_RESERVE = 80; // PageTabBar (52px) + 余白
		const BOTTOM_RESERVE = 80; // 右下 toolbar (48px) + 余白
		const SIDE_RESERVE = 40;
		const availW = Math.max(1, el.clientWidth - SIDE_RESERVE * 2);
		const availH = Math.max(1, el.clientHeight - TOP_RESERVE - BOTTOM_RESERVE);
		const requiredW = cols * (BASE_W + gap);
		const requiredH = rows * (BASE_H + gap);
		const ratio = Math.min(availW / requiredW, availH / requiredH);
		const targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.floor(ratio * 100)));
		setZoom(targetZoom);

		// 検収 #4: infinite canvas は 10000×10000 / padding 4000 構造 (WorkspaceLayout.svelte)。
		// widget pixel coord = padding-left(4000) + p-5(20px) + grid_pos × (cell + gap)
		const newCellW = (BASE_W * targetZoom) / 100;
		const newCellH = (BASE_H * targetZoom) / 100;
		const PADDING_LEFT = 4000;
		const PADDING_TOP = 4000;
		const INNER_PAD = 20; // p-5
		const bbLeft = PADDING_LEFT + INNER_PAD + minX * (newCellW + gap);
		const bbTop = PADDING_TOP + INNER_PAD + minY * (newCellH + gap);
		const bbW = cols * (newCellW + gap);
		const bbH = rows * (newCellH + gap);
		// 検収 #10: BB を viewport の中央に配置するが、上 toolbar 高さぶん補正して widgets が被らないようにする。
		const targetLeft = Math.max(0, bbLeft + bbW / 2 - el.clientWidth / 2);
		const targetTop = Math.max(
			0,
			bbTop + bbH / 2 - (el.clientHeight + TOP_RESERVE - BOTTOM_RESERVE) / 2,
		);
		const rm =
			typeof window !== 'undefined' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		queueMicrotask(() => {
			el.scrollTo({ left: targetLeft, top: targetTop, behavior: rm ? 'instant' : 'smooth' });
		});
	}

	return {
		get widgetW() {
			return widgetW;
		},
		get widgetH() {
			return widgetH;
		},
		resetZoom,
		setZoom,
		fitToContent,
	};
}
