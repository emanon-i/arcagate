import type { useWidgetZoom } from '$lib/state/widget-zoom.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';

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
			if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '!') {
				e.preventDefault();
				opts.zoom.fitToContent(workspaceStore.widgets);
				return;
			}
			if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '1') {
				e.preventDefault();
				opts.zoom.fitToContent(workspaceStore.widgets);
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

	return {
		onPointerDown(e: PointerEvent) {
			const container = opts.getContainer();
			if (!container) return;
			const isMiddle = e.button === 1;
			const isSpaceLeft = e.button === 0 && panSpacePressed;
			if (!isMiddle && !isSpaceLeft) return;
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
		},
		onPointerMove(e: PointerEvent) {
			const container = opts.getContainer();
			if (!panActive || !container) return;
			container.scrollLeft = panStart.scrollLeft - (e.clientX - panStart.x);
			container.scrollTop = panStart.scrollTop - (e.clientY - panStart.y);
		},
		onPointerUp(e: PointerEvent) {
			const container = opts.getContainer();
			if (!panActive || !container) return;
			panActive = false;
			container.releasePointerCapture(e.pointerId);
			container.style.cursor = panSpacePressed ? 'grab' : '';
		},
	};
}
