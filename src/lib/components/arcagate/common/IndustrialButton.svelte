<script lang="ts">
/**
 * IndustrialButton — Industrial Yellow design language の button prefab (ピル型物理 button)。
 *
 * spec: docs/l1_requirements/design/industrial-yellow-spec.md §3.2 / §4 / §7
 *
 * variant:
 * - primary: 蛍光イエロー fill (主要アクション)
 * - secondary: paper 背景 + border (default)
 * - ghost: 透明背景、hover で paper-dim (補助)
 * - danger: orange 系 (削除等)
 *
 * size:
 * - sm: 28px height
 * - md: 36px height (default)
 *
 * keyboard a11y: focus-visible で 蛍光イエロー ring (selected/primary は ink ring に切替)。
 */
import type { Snippet } from 'svelte';

interface Props {
	variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
	size?: 'sm' | 'md';
	type?: 'button' | 'submit' | 'reset';
	disabled?: boolean;
	'aria-label'?: string;
	title?: string;
	onclick?: (e: MouseEvent) => void;
	/** 追加 class (slot wrapper / margin 用)。 */
	class?: string;
	children?: Snippet;
}

let {
	variant = 'secondary',
	size = 'md',
	type = 'button',
	disabled = false,
	'aria-label': ariaLabel,
	title,
	onclick,
	class: extraClass = '',
	children,
}: Props = $props();

let sizeClass = $derived(size === 'sm' ? 'h-7 px-3 text-xs' : 'h-9 px-4 text-sm');
// primary は yellow fill 上に focus ring を出すと色が被って見えにくい → ink ring
let focusRingVar = $derived(variant === 'primary' ? 'var(--ag-text-primary)' : 'var(--ag-accent)');
</script>

<button
	{type}
	{disabled}
	{title}
	aria-label={ariaLabel}
	class="il-button inline-flex items-center justify-center gap-1.5 font-medium transition-[background-color,box-shadow] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--il-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ag-surface-opaque)] disabled:cursor-not-allowed disabled:opacity-[0.4] {sizeClass} {extraClass}"
	data-variant={variant}
	style="border-radius: var(--ag-radius-button); --il-focus-ring: {focusRingVar};"
	{onclick}
>
	{@render children?.()}
</button>

<style>
.il-button {
	border: 1px solid var(--ag-border);
	background: var(--ag-surface-opaque);
	color: var(--ag-text-primary);
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, 0.6),
		inset 0 -1px 0 rgba(5, 6, 5, 0.06),
		0 1px 2px rgba(5, 6, 5, 0.08);
}
.il-button:hover:not(:disabled) {
	background: var(--ag-surface-3);
}
.il-button:active:not(:disabled) {
	box-shadow: inset 0 1px 2px rgba(5, 6, 5, 0.12);
}
.il-button[data-variant="primary"] {
	background: var(--ag-accent);
	color: var(--ag-accent-text);
	border-color: var(--ag-accent);
}
.il-button[data-variant="primary"]:hover:not(:disabled) {
	background: var(--ag-accent);
}
.il-button[data-variant="primary"]:active:not(:disabled) {
	background: var(--ag-accent);
}
.il-button[data-variant="ghost"] {
	background: transparent;
	border-color: transparent;
	box-shadow: none;
}
.il-button[data-variant="ghost"]:hover:not(:disabled) {
	background: var(--ag-surface-3);
}
.il-button[data-variant="danger"] {
	background: var(--ag-surface-opaque);
	color: var(--ag-warm-text);
	border-color: var(--ag-warm-text);
}
.il-button[data-variant="danger"]:hover:not(:disabled) {
	background: var(--ag-warm-bg);
}
</style>
