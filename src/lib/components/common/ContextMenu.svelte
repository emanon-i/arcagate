<script lang="ts">
/**
 * PH-issue-024: 汎用 ContextMenu component。
 * 右クリック / longpress で位置を取って表示、Esc / click-outside で close。
 *
 * 引用元 guideline:
 * - docs/desktop_ui_ux_agent_rules.md P5 OS 文脈 (Windows 右クリック慣習)
 * - docs/l1_requirements/ux_standards.md §11 Context menu (本 plan で追記)
 */

import type { Snippet } from 'svelte';
import { onDestroy } from 'svelte';

interface Props {
	open: boolean;
	/** Viewport 座標 (clientX) */
	x: number;
	/** Viewport 座標 (clientY) */
	y: number;
	onClose: () => void;
	children: Snippet;
}

let { open, x, y, onClose, children }: Props = $props();

let menuEl = $state<HTMLDivElement | null>(null);
// PH-CF-300 (2026-05-23): menu 内容の動的拡張 (Library カードメニューが opener 一覧を
// 非同期に追加する等) で menu height が伸びても viewport を超えないよう、 ResizeObserver で
// 高さを reactive に追従する。 offsetHeight だけの参照では initial render 時の固定値となり
// 後から追加された項目 (= 削除メニュー / 動的 opener row) が viewport 外に逃げる原因になる。
let menuHeight = $state(0);
let menuWidth = $state(0);

$effect(() => {
	if (!menuEl) return;
	const obs = new ResizeObserver((entries) => {
		for (const entry of entries) {
			menuWidth = entry.contentRect.width;
			menuHeight = entry.contentRect.height;
		}
	});
	obs.observe(menuEl);
	return () => obs.disconnect();
});

function handleKey(e: KeyboardEvent) {
	if (!open) return;
	if (e.key === 'Escape') {
		e.preventDefault();
		onClose();
	}
}

function handleDocumentMousedown(e: MouseEvent) {
	if (!open) return;
	if (menuEl && !menuEl.contains(e.target as Node)) {
		onClose();
	}
}

$effect(() => {
	if (open) {
		document.addEventListener('keydown', handleKey);
		document.addEventListener('mousedown', handleDocumentMousedown);
		return () => {
			document.removeEventListener('keydown', handleKey);
			document.removeEventListener('mousedown', handleDocumentMousedown);
		};
	}
});

onDestroy(() => {
	document.removeEventListener('keydown', handleKey);
	document.removeEventListener('mousedown', handleDocumentMousedown);
});

// Viewport 端でメニューがはみ出さないよう自動で位置補正。
// menuWidth / menuHeight は ResizeObserver で reactive に更新されるため、 動的に項目が
// 追加されても adjustedX/Y は最新の menu サイズに追従する。
let adjustedX = $derived.by(() => {
	if (!menuEl || menuWidth === 0) return x;
	const max = window.innerWidth - 8;
	return Math.max(8, Math.min(x, max - menuWidth));
});
let adjustedY = $derived.by(() => {
	if (!menuEl || menuHeight === 0) return y;
	const max = window.innerHeight - 8;
	return Math.max(8, Math.min(y, max - menuHeight));
});
</script>

{#if open}
	<div
		bind:this={menuEl}
		role="menu"
		class="ag-glass fixed z-50 min-w-[14rem] max-w-[20rem] rounded-md border border-[var(--ag-border)] p-1 shadow-[var(--ag-shadow-md)]"
		style="left: {adjustedX}px; top: {adjustedY}px;"
		data-testid="context-menu"
	>
		{@render children()}
	</div>
{/if}
