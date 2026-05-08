import { configStore } from '$lib/state/config.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';
import { normalizeWheelStep } from '$lib/utils/wheel-normalize';
import {
	BASE_H,
	BASE_W,
	BOTTOM_RESERVE,
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
	GRID_GAP,
	INNER_PAD,
	MAX_ZOOM,
	MIN_ZOOM,
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
			const newZoom = clampZoom(oldZoom + delta);
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
		const targetZoom = computeFitZoom(bb, {
			clientWidth: el.clientWidth,
			clientHeight: el.clientHeight,
		});
		// Fit は viewport-anchor ではなく **明示的に origin を center に置く** ため
		// applyZoom ではなく直接 setWidgetZoom + 専用 scroll 計算を使う。
		configStore.setWidgetZoom(targetZoom);
		if (pendingZoomRAF !== null) cancelAnimationFrame(pendingZoomRAF);
		pendingZoomRAF = requestAnimationFrame(() => {
			pendingZoomRAF = null;
			// F-8 (2026-05-08 user 検収): BB が viewport に入らない (= MIN_ZOOM 飽和) 時は
			// BB top-left を viewport visual top-left に align する。center 配置だと
			// 巨大 BB の中央 = canvas 中央 empty 領域に飛んで widget 何も見えなくなる
			// (user "変な場所にフォーカス飛んで動かない")。
			const sx = cellStrideX(targetZoom);
			const sy = cellStrideY(targetZoom);
			const bbWidthPx = (bb.maxX - bb.minX) * sx - GRID_GAP;
			const bbHeightPx = (bb.maxY - bb.minY) * sy - GRID_GAP;
			const availW = el.clientWidth - SIDE_RESERVE * 2;
			const availH = el.clientHeight - TOP_RESERVE - BOTTOM_RESERVE;
			const overflows = bbWidthPx > availW || bbHeightPx > availH;
			if (overflows) {
				// BB top-left → viewport top-left の align (widget が必ず見える)。
				const buffer = bufferOffsetPx(targetZoom);
				const minPxX = INNER_PAD + buffer.x + bb.minX * sx;
				const minPxY = INNER_PAD + buffer.y + bb.minY * sy;
				el.scrollTo({
					left: Math.max(0, minPxX - SIDE_RESERVE),
					top: Math.max(0, minPxY - TOP_RESERVE),
					behavior: 'instant',
				});
			} else {
				const target = computeFitScroll(origin, targetZoom, {
					clientWidth: el.clientWidth,
					clientHeight: el.clientHeight,
				});
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
