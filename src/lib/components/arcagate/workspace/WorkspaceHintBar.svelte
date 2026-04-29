<script lang="ts">
import { cubicOut } from 'svelte/easing';
import { fade, fly } from 'svelte/transition';

/**
 * 4/30 user 検収 #2 + #11: 「Ctrl+Z 注意書きが常時表示されてうるさい」「上下バーの背景色削除」
 *
 * - 非選択時 (selectedWidgetId == null): HintBar 全体を非表示
 *   (zoom / undo / pan 等は熟練者が知っているため常時 hint 不要、初心者向けは別途 onboarding 想定)
 * - 選択時: 下端に Del / Esc hint を表示 (透明 + 罫線なし、wallpaper に重ねても邪魔にならない)
 *
 * 引用元 guideline:
 * - docs/l1_requirements/ux_standards.md §13 Workspace Canvas (Obsidian 入力マッピング)
 * - docs/desktop_ui_ux_agent_rules.md P11 装飾より対象 / P9 画面密度
 */
interface Props {
	// 編集モード撤廃済、prop 互換のため受け取るが未使用 (将来削除予定)
	editMode?: boolean;
	selectedWidgetId: string | null;
}

let { selectedWidgetId }: Props = $props();

const rm =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;
</script>

{#if selectedWidgetId}
<div
	class="pointer-events-none absolute bottom-0 left-0 right-0 z-20"
	in:fly={{ y: 12, duration: dNormal, easing: cubicOut }}
	out:fade={{ duration: dFast }}
>
	<div
		class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-6 py-2 text-xs text-[var(--ag-text-muted)]"
	>
		<span class="font-medium text-[var(--ag-accent-text)]">1 件選択中</span>
		<span class="text-[var(--ag-text-faint)]">·</span>
		<span class="inline-flex items-center gap-1">
			<kbd class="rounded bg-[var(--ag-surface-4)] px-1.5 py-0.5 font-mono">Del</kbd>
			削除
		</span>
		<span class="text-[var(--ag-text-faint)]">·</span>
		<span class="inline-flex items-center gap-1">
			<kbd class="rounded bg-[var(--ag-surface-4)] px-1.5 py-0.5 font-mono">Esc</kbd>
			選択解除
		</span>
	</div>
</div>
{/if}
