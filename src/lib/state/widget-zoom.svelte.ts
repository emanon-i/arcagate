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
	 * 全 widget の bounding box が container に収まるよう zoom 自動計算。
	 * widgets が空なら 100% にリセット。
	 */
	function fitToContent(widgets: WorkspaceWidget[]) {
		const el = containerRef();
		if (!el || widgets.length === 0) {
			resetZoom();
			return;
		}
		const maxX = widgets.reduce((m, w) => Math.max(m, w.position_x + w.width), 0);
		const maxY = widgets.reduce((m, w) => Math.max(m, w.position_y + w.height), 0);
		if (maxX === 0 || maxY === 0) {
			resetZoom();
			return;
		}
		const gap = 16;
		const padding = 32;
		const availW = el.clientWidth - padding;
		const availH = el.clientHeight - padding;
		const requiredW = maxX * (BASE_W + gap);
		const requiredH = maxY * (BASE_H + gap);
		const ratioW = availW / requiredW;
		const ratioH = availH / requiredH;
		const ratio = Math.min(ratioW, ratioH);
		const targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.floor(ratio * 100)));
		setZoom(targetZoom);
		// scroll を (0,0) に戻して全体が見えるように
		el.scrollLeft = 0;
		el.scrollTop = 0;
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
