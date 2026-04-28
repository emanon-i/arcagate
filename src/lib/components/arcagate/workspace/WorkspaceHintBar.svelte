<script lang="ts">
import { cubicOut } from 'svelte/easing';
import { fade, fly } from 'svelte/transition';

/**
 * PH-issue-002 で編集モードを撤廃したため、HintBar は常時 Workspace で表示される。
 * Obsidian Canvas 慣習の入力マッピング (zoom / undo / redo / pan) を hint として表示。
 *
 * 引用元 guideline:
 * - docs/l1_requirements/ux_standards.md §13 Workspace Canvas (Obsidian 入力マッピング)
 * - docs/desktop_ui_ux_agent_rules.md P10 (熟練者効率、shortcut 可視化)
 *
 * PH-widget-polish:
 * - 旧「キャンセル / 確定 / 削除」hint は編集モード撤廃で意味を失った
 * - 選択中: Del / Esc を表示 (削除と選択解除)
 * - 非選択中: Ctrl+wheel / Ctrl+0 / Ctrl+Shift+1 / Ctrl+Z / Space+drag を表示
 *   (Obsidian 慣習で熟練者が即気付ける配置)
 * - bg を opaque/85 + backdrop-blur-sm にして壁紙が透ける時も読みやすく (P11 装飾より対象)
 */
interface Props {
	// PH-issue-002 で編集モード撤廃、prop 互換のため受け取るが常時表示。
	// biome-ignore lint/correctness/noUnusedFunctionParameters: 後方互換、撤廃予定
	editMode?: boolean;
	selectedWidgetId: string | null;
}

let { selectedWidgetId }: Props = $props();

const rm =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;
</script>

<div
	class="pointer-events-none absolute bottom-0 left-0 right-0 z-20"
	in:fly={{ y: 12, duration: dNormal, easing: cubicOut }}
	out:fade={{ duration: dFast }}
>
	<div
		class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-[var(--ag-border)] bg-[var(--ag-surface-opaque)]/85 px-6 py-2 text-xs text-[var(--ag-text-muted)] backdrop-blur-sm"
		class:border-l-2={selectedWidgetId}
		class:border-l-[var(--ag-accent)]={selectedWidgetId}
	>
		{#if selectedWidgetId}
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
		{:else}
			<span class="inline-flex items-center gap-1">
				<kbd class="rounded bg-[var(--ag-surface-4)] px-1.5 py-0.5 font-mono">Ctrl+wheel</kbd>
				拡大縮小
			</span>
			<span class="text-[var(--ag-text-faint)]">·</span>
			<span class="inline-flex items-center gap-1">
				<kbd class="rounded bg-[var(--ag-surface-4)] px-1.5 py-0.5 font-mono">Ctrl+0</kbd>
				100%
			</span>
			<span class="text-[var(--ag-text-faint)]">·</span>
			<span class="inline-flex items-center gap-1">
				<kbd class="rounded bg-[var(--ag-surface-4)] px-1.5 py-0.5 font-mono">Ctrl+Shift+1</kbd>
				全体
			</span>
			<span class="text-[var(--ag-text-faint)]">·</span>
			<span class="inline-flex items-center gap-1">
				<kbd class="rounded bg-[var(--ag-surface-4)] px-1.5 py-0.5 font-mono">Ctrl+Z</kbd>
				取り消し
			</span>
			<span class="text-[var(--ag-text-faint)]">·</span>
			<span class="inline-flex items-center gap-1">
				<kbd class="rounded bg-[var(--ag-surface-4)] px-1.5 py-0.5 font-mono">Space+drag</kbd>
				パン
			</span>
		{/if}
	</div>
</div>
