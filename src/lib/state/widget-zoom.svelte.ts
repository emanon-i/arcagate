import { configStore } from '$lib/state/config.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';
import { normalizeWheelStep } from '$lib/utils/wheel-normalize';
import {
	BASE_H,
	BASE_W,
	bufferOffsetPx,
	cellStrideX,
	cellStrideY,
	clampAnchor,
	clampZoom,
	computeBoundingBox,
	computeFitScroll,
	computeFitZoom,
	computeOrigin,
	computeZoomAnchorScroll,
	effectiveBottomReserve,
	GRID_GAP,
	INNER_PAD,
	MAX_ZOOM,
	MIN_ZOOM,
	MIN_ZOOM_FIT,
	RESET_ZOOM,
	SIDE_RESERVE,
	TOP_RESERVE,
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
			// Q1 確定: Wheel zoom anchor = mouse cursor (Excalidraw / Figma / tldraw 業界標準)。
			// e.clientX/Y は viewport (window) coord のため、container の clientRect を引いて
			// container-relative coord に変換する。container は左右に sidebar 等があるため offset 必須。
			const delta = normalizeWheelStep(e);
			const oldZoom = configStore.widgetZoom;
			const newZoom = clampZoom(
				oldZoom + delta,
				configStore.widgetMinZoom,
				configStore.widgetMaxZoom,
			);
			if (newZoom === oldZoom) return;
			const rect = el.getBoundingClientRect();
			// 5/05 Codex L5 fix: cursor anchor を container bounds に clamp。
			// momentum wheel / iframe / DPR 不整合で viewport 外座標が来た場合に
			// scroll が急 jump するのを防ぐ。
			const cursor = clampAnchor(
				{ x: e.clientX - rect.left, y: e.clientY - rect.top },
				{ clientWidth: el.clientWidth, clientHeight: el.clientHeight },
			);
			applyZoom(el, oldZoom, newZoom, cursor);
		} else if (e.shiftKey) {
			e.preventDefault();
			el.scrollLeft += e.deltaY;
		}
	}

	// R7-3 / H2 rapid zoom rAF race fix:
	//   wheel event を超高速で連発すると、複数の requestAnimationFrame が pending になり
	//   DOM reflow 順序が乱れて scroll target がずれる (古い計算結果が後勝ちする現象)。
	//   pendingZoomRAF で前回 rAF を cancel、常に最新の計算結果だけ apply する。
	let pendingZoomRAF: number | null = null;

	$effect(() => {
		const el = containerRef();
		if (!el) return;
		el.addEventListener('wheel', handleWheel, { passive: false });
		return () => el.removeEventListener('wheel', handleWheel);
	});

	/**
	 * zoom 変更 + anchor-preserving scroll 補正の共通処理。
	 * Reset / Button zoom: anchor 省略 → viewport center
	 * Wheel zoom: anchor = mouse cursor (container-relative)
	 */
	function applyZoom(
		el: HTMLElement,
		oldZoom: number,
		newZoom: number,
		anchor?: { x: number; y: number },
	) {
		const target = computeZoomAnchorScroll(
			oldZoom,
			newZoom,
			{
				clientWidth: el.clientWidth,
				clientHeight: el.clientHeight,
				scrollLeft: el.scrollLeft,
				scrollTop: el.scrollTop,
			},
			anchor,
		);
		configStore.setWidgetZoom(newZoom);
		// Svelte reactive flush + DOM reflow を待ってから scrollTo。
		// queueMicrotask は reflow 前に走ることがあるため requestAnimationFrame を使う。
		// R7-3 H2 fix: 前回の pending rAF を cancel して race を排除。
		if (pendingZoomRAF !== null) cancelAnimationFrame(pendingZoomRAF);
		pendingZoomRAF = requestAnimationFrame(() => {
			pendingZoomRAF = null;
			el.scrollTo({ left: target.scrollLeft, top: target.scrollTop, behavior: 'instant' });
		});
	}

	function setZoom(value: number) {
		const el = containerRef();
		const newZoom = clampZoom(value, configStore.widgetMinZoom, configStore.widgetMaxZoom);
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
	 * Fit to content。
	 *
	 * F-8 v3 (2026-05-09 user 再検収):
	 *   - v2 は MIN_ZOOM_FIT=1 で BB が常に viewport に収まる仕様だったが、小窓の時 2% 等の
	 *     極端値で widget が読めない UX 問題が発生した (user "極端な値、テストしてないだろう")。
	 *   - v3 は MIN_ZOOM_FIT=5 に引き上げ。BB が MIN で overflow する時は **BB top-left を
	 *     viewport visual top-left に align** する scroll fallback を再導入 (= F-8 v1 の挙動)。
	 *   - **BB は widget の position_x/y/width/height だけで計算** (canvas buffer 領域は不参照)。
	 *
	 * K-8 (2026-05-16): 上限を **RESET_ZOOM=100% → MAX_ZOOM=200%** に変更。 旧 100% 縛りで
	 * 小 BB (1-4 widget) は Fit しても画面いっぱいにならず buffer 領域が視覚的優位になり
	 * 「左に寄る + 小さい」 user 体感の root cause だった。 200% 上限で widget は viewport を
	 * 適切に埋めるようになり、 BB 中央配置の視覚的整合性が改善する。
	 *
	 *   挙動 matrix (K-8 後):
	 *     - 空 workspace                  → 100% + canvas 中央 scroll
	 *     - 1 widget (small)              → 200% (上限) + widget center
	 *     - 2-3 widgets 離散              → 80-200% 想定 + BB center
	 *     - 多数広域 (BB 大)              → 5-100% 想定 + BB center
	 *     - 極端 (BB が 5% でも入らない)  → 5% + BB top-left align
	 */
	function fitToContent(widgets: WorkspaceWidget[]) {
		const el = containerRef();
		if (!el) return;
		if (widgets.length === 0) {
			// 空: zoom を 100% + canvas 中央へ scroll (instant)
			configStore.setWidgetZoom(RESET_ZOOM);
			if (pendingZoomRAF !== null) cancelAnimationFrame(pendingZoomRAF);
			pendingZoomRAF = requestAnimationFrame(() => {
				pendingZoomRAF = null;
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
		const bottomReserve = effectiveBottomReserve(configStore.hintBarVisible);
		const targetZoom = computeFitZoom(
			bb,
			{ clientWidth: el.clientWidth, clientHeight: el.clientHeight },
			configStore.widgetMaxZoom,
			bottomReserve,
		);
		configStore.setWidgetZoom(targetZoom);
		if (pendingZoomRAF !== null) cancelAnimationFrame(pendingZoomRAF);
		pendingZoomRAF = requestAnimationFrame(() => {
			pendingZoomRAF = null;
			// computeFitZoom は固定 gap を正しく差し引いた zoom を返すため、 MIN_ZOOM_FIT で
			// 飽和していない限り BB は availW/availH に必ず収まる。 飽和時 (BB が極小 zoom でも
			// 入らない) のみ実測 overflow を判定し、 overflow なら BB top-left align
			// (widget が必ず見える)、 それ以外は BB 重心を viewport 幾何中心に置く。
			const saturatedMin = targetZoom <= MIN_ZOOM_FIT;
			let overflows = false;
			if (saturatedMin) {
				const sx = cellStrideX(targetZoom);
				const sy = cellStrideY(targetZoom);
				const bbWidthPx = (bb.maxX - bb.minX) * sx - GRID_GAP;
				const bbHeightPx = (bb.maxY - bb.minY) * sy - GRID_GAP;
				const availW = el.clientWidth - SIDE_RESERVE * 2;
				const availH = el.clientHeight - TOP_RESERVE - bottomReserve;
				overflows = bbWidthPx > availW || bbHeightPx > availH;
			}
			if (overflows) {
				const sx = cellStrideX(targetZoom);
				const sy = cellStrideY(targetZoom);
				const buffer = bufferOffsetPx(targetZoom);
				const minPxX = INNER_PAD + buffer.x + bb.minX * sx;
				const minPxY = INNER_PAD + buffer.y + bb.minY * sy;
				el.scrollTo({
					left: Math.max(0, minPxX - SIDE_RESERVE),
					top: Math.max(0, minPxY - TOP_RESERVE),
					behavior: 'instant',
				});
			} else {
				const target = computeFitScroll(
					origin,
					targetZoom,
					{
						clientWidth: el.clientWidth,
						clientHeight: el.clientHeight,
					},
					bottomReserve,
				);
				el.scrollTo({
					left: target.scrollLeft,
					top: target.scrollTop,
					behavior: 'instant',
				});
			}
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
