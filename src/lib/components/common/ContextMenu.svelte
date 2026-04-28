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
let adjustedX = $derived.by(() => {
	if (!menuEl) return x;
	const w = menuEl.offsetWidth;
	const max = window.innerWidth - 8;
	return Math.min(x, max - w);
});
let adjustedY = $derived.by(() => {
	if (!menuEl) return y;
	const h = menuEl.offsetHeight;
	const max = window.innerHeight - 8;
	return Math.min(y, max - h);
});
</script>

{#if open}
	<div
		bind:this={menuEl}
		role="menu"
		class="fixed z-50 min-w-[14rem] rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] p-1 shadow-[var(--ag-shadow-md)]"
		style="left: {adjustedX}px; top: {adjustedY}px;"
		data-testid="context-menu"
	>
		{@render children()}
	</div>
{/if}
