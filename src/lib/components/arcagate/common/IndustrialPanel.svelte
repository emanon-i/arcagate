<script lang="ts">
/**
 * IndustrialPanel — Industrial Yellow design language の panel prefab。
 *
 * spec: docs/l1_requirements/design/industrial-yellow-spec.md §3.3 / §3.4 / §7
 *
 * 構造:
 * - paper 背景 + 軽い border-radius (≤8px)
 * - 任意で L 字 bracket (focus / 選択 強調)
 * - 任意で hatching / dotscreen の decorative texture
 * - 3 slot: header (任意) / default / footer (任意)
 *
 * 使用例:
 *   <IndustrialPanel bracket={selected} hatching={loading}>
 *     {#snippet header()}<h3>タイトル</h3>{/snippet}
 *     <p>本体</p>
 *   </IndustrialPanel>
 */
import type { Snippet } from 'svelte';

interface Props {
	/** L 字 bracket を corner に表示 (focus / 選択 強調)。 */
	bracket?: boolean;
	/** bracket を蛍光イエローで描画 (selected 状態用)。default は ink。 */
	bracketYellow?: boolean;
	/** 斜線ハッチ (loading / skeleton 用)。 */
	hatching?: boolean;
	/** ハーフトーンドット (decorative、header 部に薄く)。 */
	dotscreen?: boolean;
	/** padding を切る (table 等を中に直接置きたいとき)。 */
	flush?: boolean;
	/** その他 class 追加。 */
	class?: string;
	header?: Snippet;
	footer?: Snippet;
	children?: Snippet;
}

let {
	bracket = false,
	bracketYellow = false,
	hatching = false,
	dotscreen = false,
	flush = false,
	class: extraClass = '',
	header,
	footer,
	children,
}: Props = $props();
</script>

<div
	class="il-panel relative bg-[var(--ag-il-paper)] text-[var(--ag-il-ink)] {bracket
		? 'il-bracket-corner'
		: ''} {extraClass}"
	style="border-radius: var(--ag-il-radius-card); border: 1px solid var(--ag-il-border); --bracket-c: {bracketYellow
		? 'var(--ag-il-yellow)'
		: 'var(--ag-il-bracket)'};"
>
	{#if hatching}
		<div class="il-hatching pointer-events-none absolute inset-0 rounded-[inherit]"></div>
	{/if}
	{#if header}
		<div class="relative {dotscreen ? 'il-dotscreen' : ''} {flush ? '' : 'px-4 py-3'} border-b border-[var(--ag-il-border)]">
			{@render header()}
		</div>
	{/if}
	<div class="relative {flush ? '' : 'p-4'}">
		{@render children?.()}
	</div>
	{#if footer}
		<div class="relative border-t border-[var(--ag-il-border)] {flush ? '' : 'px-4 py-3'}">
			{@render footer()}
		</div>
	{/if}
</div>

<style>
.il-bracket-corner::before,
.il-bracket-corner::after {
	content: "";
	position: absolute;
	pointer-events: none;
	width: 12px;
	height: 12px;
	border-color: var(--bracket-c);
	border-style: solid;
	border-width: 0;
}
.il-bracket-corner::before {
	top: -1px;
	left: -1px;
	border-top-width: 2px;
	border-left-width: 2px;
}
.il-bracket-corner::after {
	bottom: -1px;
	right: -1px;
	border-bottom-width: 2px;
	border-right-width: 2px;
}
.il-hatching {
	background-image: repeating-linear-gradient(
		-45deg,
		rgba(5, 6, 5, 0.05) 0,
		rgba(5, 6, 5, 0.05) 4px,
		transparent 4px,
		transparent 8px
	);
}
.il-dotscreen {
	background-image: radial-gradient(circle at 1px 1px, rgba(5, 6, 5, 0.08) 1px, transparent 1.5px);
	background-size: 6px 6px;
}
</style>
