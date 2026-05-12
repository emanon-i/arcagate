import type { useWidgetZoom } from '$lib/state/widget-zoom.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { workspaceSelection } from '$lib/state/workspace-selection.svelte';

interface InputOpts {
	getContainer: () => HTMLDivElement | null;
	getSelectedId: () => string | null;
	setSelectedId: (id: string | null) => void;
	isModalOpen: () => boolean;
	onDelete: (id: string) => void;
	zoom: ReturnType<typeof useWidgetZoom>;
}

function isEditableTarget(target: EventTarget | null): boolean {
	const el = target as HTMLElement | null;
	return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

/**
 * Workspace canvas の input handler 集約。
 *   - 中ボタン drag / Space + 左 drag で自由 pan
 *   - Ctrl + Z / Y / Shift+Z で Undo / Redo
 *   - Ctrl + 0 / Ctrl + Shift + 1 で zoom reset / fit
 *   - Delete / Backspace で選択 widget 削除、Esc で選択解除
 *
 * 引用元 guideline: docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1
 *   (DragResize handler を hook 化、Svelte 5 慣用句に合わせる)
 */
export function useWorkspaceInput(opts: InputOpts) {
	let panActive = $state(false);
	let panSpacePressed = $state(false);
	let panStart = { x: 0, y: 0, scrollLeft: 0, scrollTop: 0 };

	$effect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.code !== 'Space') return;
			if (isEditableTarget(e.target)) return;
			e.preventDefault();
			panSpacePressed = true;
			const c = opts.getContainer();
			if (c && !panActive) {
				c.style.cursor = 'grab';
			}
		}
		function onKeyUp(e: KeyboardEvent) {
			if (e.code === 'Space') {
				panSpacePressed = false;
				const c = opts.getContainer();
				if (c && !panActive) {
					c.style.cursor = '';
				}
			}
		}
		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
		};
	});

	$effect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (isEditableTarget(e.target)) return;
			if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
				e.preventDefault();
				void workspaceStore.undo();
				return;
			}
			if (
				(e.ctrlKey || e.metaKey) &&
				((e.shiftKey && e.key.toLowerCase() === 'z') ||
					(!e.shiftKey && e.key.toLowerCase() === 'y'))
			) {
				e.preventDefault();
				void workspaceStore.redo();
				return;
			}
			if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === '0') {
				e.preventDefault();
				opts.zoom.resetZoom();
				return;
			}
			// audit batch deferred (2026-05-13) #12: Ctrl+A で active workspace の全 widget 選択。
			// modal 開いてる時 / input フォーカス中は無視。
			if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'a' || e.key === 'A')) {
				if (opts.isModalOpen()) return;
				const target = e.target as HTMLElement | null;
				if (
					target?.tagName === 'INPUT' ||
					target?.tagName === 'TEXTAREA' ||
					target?.isContentEditable
				) {
					return;
				}
				e.preventDefault();
				workspaceSelection.setMany(workspaceStore.widgets.map((w) => w.id));
				return;
			}
			if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === '!' || e.key === '1')) {
				e.preventDefault();
				// U-8 (2026-05-12): 選択中 widget があれば選択範囲を fit、無ければ全 widget。
				const target =
					workspaceSelection.size > 0
						? workspaceStore.widgets.filter((w) => workspaceSelection.has(w.id))
						: workspaceStore.widgets;
				opts.zoom.fitToContent(target);
				return;
			}
			const id = opts.getSelectedId();
			if (e.key === 'Escape' && id && !opts.isModalOpen()) {
				e.preventDefault();
				opts.setSelectedId(null);
				return;
			}
			if (e.key === 'Delete' || e.key === 'Backspace') {
				if (id && !opts.isModalOpen()) {
					e.preventDefault();
					opts.setSelectedId(null);
					opts.onDelete(id);
				}
			}
		}
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	});

	// audit batch deferred (2026-05-13) #12 part 2: Box (rubber-band) 選択。
	// 左 click + empty canvas → drag で rect overlay 描画 → release で intersect widgets を selectMany。
	let boxActive = $state(false);
	let boxStart = $state({ x: 0, y: 0 });
	let boxCurrent = $state({ x: 0, y: 0 });

	function isOnWidget(target: EventTarget | null): boolean {
		const el = target as HTMLElement | null;
		if (!el) return false;
		// widget-shell or any descendant が click target なら widget 上 (= box select 開始しない)
		// image-widget-critical fix (2026-05-13):
		// - [role="dialog"]: WidgetSettingsDialog 等 modal の click が box-select に奪われる bug 防止
		// - [data-widget-id]: widget root marker。 × close button / 8 方向 resize handle / drag grip
		//   は WidgetShell 内 ではなく widget root の sibling として render される (WidgetHandles
		//   が WidgetShell と並列、 WorkspaceWidgetGrid:240 参照)。 [data-widget-id] は widget root
		//   div の canonical marker (PR #443 で追加) で widget 領域全体を包含。 .widget-shell 単独
		//   selector では handle / button の click を canvas が steal する regression を起こすため
		//   必須。 (user 報告: 「ウィジット閉じるボタンで閉じない」)
		return !!el.closest(
			'[data-widget-id], .widget-shell, [data-widget-handle], [role="menu"], [role="dialog"]',
		);
	}

	function viewportToContainerCoords(e: PointerEvent, container: HTMLDivElement) {
		const rect = container.getBoundingClientRect();
		return {
			x: e.clientX - rect.left + container.scrollLeft,
			y: e.clientY - rect.top + container.scrollTop,
		};
	}

	return {
		boxSelectState: {
			get active() {
				return boxActive;
			},
			get rect() {
				const left = Math.min(boxStart.x, boxCurrent.x);
				const top = Math.min(boxStart.y, boxCurrent.y);
				const width = Math.abs(boxCurrent.x - boxStart.x);
				const height = Math.abs(boxCurrent.y - boxStart.y);
				return { left, top, width, height };
			},
		},
		onPointerDown(e: PointerEvent) {
			const container = opts.getContainer();
			if (!container) return;
			const isMiddle = e.button === 1;
			const isSpaceLeft = e.button === 0 && panSpacePressed;
			if (isMiddle || isSpaceLeft) {
				e.preventDefault();
				panActive = true;
				panStart = {
					x: e.clientX,
					y: e.clientY,
					scrollLeft: container.scrollLeft,
					scrollTop: container.scrollTop,
				};
				container.setPointerCapture(e.pointerId);
				container.style.cursor = 'grabbing';
				return;
			}
			// 左 click + widget 上でない → box select 開始
			if (e.button === 0 && !isOnWidget(e.target)) {
				const p = viewportToContainerCoords(e, container);
				boxStart = { x: p.x, y: p.y };
				boxCurrent = { x: p.x, y: p.y };
				boxActive = true;
				container.setPointerCapture(e.pointerId);
			}
		},
		onPointerMove(e: PointerEvent) {
			const container = opts.getContainer();
			if (!container) return;
			if (panActive) {
				container.scrollLeft = panStart.scrollLeft - (e.clientX - panStart.x);
				container.scrollTop = panStart.scrollTop - (e.clientY - panStart.y);
				return;
			}
			if (boxActive) {
				const p = viewportToContainerCoords(e, container);
				boxCurrent = { x: p.x, y: p.y };
			}
		},
		onPointerUp(e: PointerEvent) {
			const container = opts.getContainer();
			if (!container) return;
			if (panActive) {
				panActive = false;
				container.releasePointerCapture(e.pointerId);
				container.style.cursor = panSpacePressed ? 'grab' : '';
				return;
			}
			if (boxActive) {
				boxActive = false;
				container.releasePointerCapture(e.pointerId);
				// box rect と各 widget の bounding box の overlap を取って selectMany。
				const left = Math.min(boxStart.x, boxCurrent.x);
				const top = Math.min(boxStart.y, boxCurrent.y);
				const right = Math.max(boxStart.x, boxCurrent.x);
				const bottom = Math.max(boxStart.y, boxCurrent.y);
				if (right - left < 4 && bottom - top < 4) return; // tap-only は無視
				const widgetEls = container.querySelectorAll<HTMLElement>('[data-widget-id]');
				const containerRect = container.getBoundingClientRect();
				const intersected: string[] = [];
				for (const el of widgetEls) {
					const r = el.getBoundingClientRect();
					const wLeft = r.left - containerRect.left + container.scrollLeft;
					const wTop = r.top - containerRect.top + container.scrollTop;
					const wRight = wLeft + r.width;
					const wBottom = wTop + r.height;
					if (wLeft < right && wRight > left && wTop < bottom && wBottom > top) {
						const id = el.dataset.widgetId;
						if (id) intersected.push(id);
					}
				}
				if (intersected.length > 0) {
					workspaceSelection.setMany(intersected);
				} else {
					workspaceSelection.clear();
				}
			}
		},
	};
}
