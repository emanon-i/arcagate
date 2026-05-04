import { configStore } from '$lib/state/config.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';
import {
	BASE_H,
	BASE_W,
	clampZoom,
	computeBoundingBox,
	computeFitScroll,
	computeFitZoom,
	computeOrigin,
	computeZoomAnchorScroll,
	MAX_ZOOM,
	MIN_ZOOM,
	RESET_ZOOM,
} from '$lib/utils/zoom-math';

/**
 * 5/04 user 検収 (post-redo3 #7) 抜本書き直し:
 *   - 旧実装は二重 clamp / 5 単位 round / scroll を更新しない Reset 等で挙動破綻
 *   - 新実装は zoom-math.ts に純粋関数を切り出し、ここでは DOM 操作のみ
 *
 * 仕様 (user 確定):
 *   - **Reset zoom**: viewport 中央を anchor に zoom 100% に戻す。scroll は anchor 補正のみ。
 *   - **Fit to content**: 全 widget の BB 重心 (= 原点 origin) を計算 → BB が viewport に収まる zoom →
 *     原点を viewport 中央に持ってくる scroll を 1 step で適用。
 *   - widget 追加 / 編集 / 移動 / リサイズ では scroll / zoom は変更しない (workspace ストア側で保証)。
 *
 * 入力マッピング (変更なし):
 *   - Ctrl + wheel: zoom (±10、25〜200%)
 *   - Shift + wheel: 横 scroll (Figma / Miro 標準)
 *   - 通常 wheel: 縦 scroll (ブラウザ標準)
 */
export function useWidgetZoom(containerRef: () => HTMLElement | null) {
	const widgetW = $derived(Math.round(BASE_W * (configStore.widgetZoom / 100)));
	const widgetH = $derived(Math.round(BASE_H * (configStore.widgetZoom / 100)));

	function handleWheel(e: WheelEvent) {
		const el = containerRef();
		if (!el) return;
		if (e.ctrlKey) {
			e.preventDefault();
			// wheel zoom も viewport-anchor で挙動を Reset と統一
			const delta = e.deltaY > 0 ? -10 : 10;
			const oldZoom = configStore.widgetZoom;
			const newZoom = clampZoom(oldZoom + delta);
			if (newZoom === oldZoom) return;
			applyZoom(el, oldZoom, newZoom);
		} else if (e.shiftKey) {
			e.preventDefault();
			el.scrollLeft += e.deltaY;
		}
	}

	$effect(() => {
		const el = containerRef();
		if (!el) return;
		el.addEventListener('wheel', handleWheel, { passive: false });
		return () => el.removeEventListener('wheel', handleWheel);
	});

	/**
	 * zoom 変更 + viewport-center anchor scroll 補正の共通処理。
	 * Reset zoom と wheel zoom の両方が呼ぶ。
	 */
	function applyZoom(el: HTMLElement, oldZoom: number, newZoom: number) {
		const target = computeZoomAnchorScroll(oldZoom, newZoom, {
			clientWidth: el.clientWidth,
			clientHeight: el.clientHeight,
			scrollLeft: el.scrollLeft,
			scrollTop: el.scrollTop,
		});
		configStore.setWidgetZoom(newZoom);
		// Svelte reactive flush + DOM reflow を待ってから scrollTo。
		// queueMicrotask は reflow 前に走ることがあるため requestAnimationFrame を使う。
		requestAnimationFrame(() => {
			el.scrollTo({ left: target.scrollLeft, top: target.scrollTop, behavior: 'instant' });
		});
	}

	function setZoom(value: number) {
		const el = containerRef();
		const newZoom = clampZoom(value);
		const oldZoom = configStore.widgetZoom;
		if (newZoom === oldZoom) return;
		if (!el) {
			configStore.setWidgetZoom(newZoom);
			return;
		}
		applyZoom(el, oldZoom, newZoom);
	}

	function resetZoom() {
		setZoom(RESET_ZOOM);
	}

	/**
	 * Fit to content (post-redo3 #7 抜本書き直し):
	 *   1. BB を計算 (空 → 100% zoom + canvas 中央 scroll)
	 *   2. 重心 = origin (= 原点) を確定
	 *   3. BB が available area に収まる zoom を計算 → setZoom (anchor 補正なしで純 zoom 切替)
	 *   4. requestAnimationFrame 待ち後に origin を viewport center に持ってくる scrollTo
	 */
	function fitToContent(widgets: WorkspaceWidget[]) {
		const el = containerRef();
		if (!el) return;
		if (widgets.length === 0) {
			// 空: zoom を 100% + canvas 中央へ scroll (instant)
			configStore.setWidgetZoom(RESET_ZOOM);
			requestAnimationFrame(() => {
				el.scrollTo({
					left: Math.max(0, (el.scrollWidth - el.clientWidth) / 2),
					top: Math.max(0, (el.scrollHeight - el.clientHeight) / 2),
					behavior: 'instant',
				});
			});
			return;
		}
		const bb = computeBoundingBox(widgets);
		if (!bb) {
			configStore.setWidgetZoom(RESET_ZOOM);
			return;
		}
		const origin = computeOrigin(bb);
		const targetZoom = computeFitZoom(bb, {
			clientWidth: el.clientWidth,
			clientHeight: el.clientHeight,
		});
		// Fit は viewport-anchor ではなく **明示的に origin を center に置く** ため
		// applyZoom ではなく直接 setWidgetZoom + 専用 scroll 計算を使う。
		configStore.setWidgetZoom(targetZoom);
		requestAnimationFrame(() => {
			const target = computeFitScroll(origin, targetZoom, {
				clientWidth: el.clientWidth,
				clientHeight: el.clientHeight,
			});
			el.scrollTo({
				left: target.scrollLeft,
				top: target.scrollTop,
				behavior: 'instant',
			});
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
		// re-export 定数 (test / 他 component から参照しやすくするため)
		MIN_ZOOM,
		MAX_ZOOM,
		RESET_ZOOM,
	};
}
