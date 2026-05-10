<script lang="ts">
import type { Snippet } from 'svelte';
import { cubicOut } from 'svelte/easing';
import { fade, scale } from 'svelte/transition';

/**
 * BaseDialog (refactor: Dialog wrapper unify、TOP 3 候補 #1)。
 *
 * 引用元: `E:/tmp/arcagate-refactor-guidelines.md` + `E:/tmp/arcagate-refactor-plan.md` §1
 *
 * 共通挙動 (6 件 dialog で 95% 一致) を吸収する thin wrapper:
 * - Escape close (`<svelte:window>` listener、modal div 上ではなく window で確実に発火)
 * - Backdrop click close (`e.target === e.currentTarget` で内側クリックは無視)
 * - fade (dFast=120) + scale (dNormal=200, cubicOut, start=0.96) transition
 * - prefers-reduced-motion 対応 (motion-reduce 時は duration=0)
 * - role="dialog" / aria-modal / aria-labelledby / aria-describedby pass-through
 * - bg-[var(--ag-surface-opaque)] + border + shadow-dialog の box style
 *
 * 残 5% (caller 固有) は **caller 側で吸収**:
 * - 個別 keyboard handler (例: ConfirmDialog の Enter → onConfirm) は caller の
 *   `<svelte:window>` を別途追加 (重複 listener OK、各々別 key を担当)
 * - $effect on open (例: WorkspaceWallpaperDialog の値 reload、WidgetSettingsDialog の
 *   config parse) は caller の component で `$effect` を持つだけ
 * - form submit / button arrangement / icon は caller 側 children snippet で render
 *
 * API:
 * - props: `open` / `onClose` / `ariaLabelledby?` / `ariaDescribedby?` / `size?`
 * - snippet: `children` — header + body + footer 全部 caller layout
 *
 * Anti-pattern 回避:
 * - prop 5 個以下 (Apropcolypse 回避)
 * - flag 系は size のみ (Wrong abstraction 回避)
 * - children は単一 snippet (sub-snippet 強制で caller 自由度を奪わない、leaky abstraction 回避)
 */
interface Props {
	open: boolean;
	onClose: () => void;
	ariaLabelledby?: string;
	ariaDescribedby?: string;
	size?: 'sm' | 'md' | 'lg' | 'xl';
	children: Snippet;
}

let { open, onClose, ariaLabelledby, ariaDescribedby, size = 'sm', children }: Props = $props();

const rm =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;

const sizeClass = $derived(
	size === 'sm' ? 'max-w-sm' : size === 'md' ? 'max-w-md' : size === 'lg' ? 'max-w-lg' : 'max-w-xl',
);
</script>

<!-- Escape close: window listener で root-cause fix。modal div 上の onkeydown は trigger
     button から focus が移動しないため発火しない (refactor/escape-key-fix の精神を継承)。 -->
<svelte:window
	onkeydown={(e) => {
		if (open && e.key === 'Escape') onClose();
	}}
/>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		aria-labelledby={ariaLabelledby}
		aria-describedby={ariaDescribedby}
		tabindex="-1"
		transition:fade={{ duration: dFast }}
		onclick={(e) => {
			if (e.target === e.currentTarget) onClose();
		}}
	>
		<div
			class="w-full {sizeClass} rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] p-6 shadow-[var(--ag-shadow-dialog)]"
			transition:scale={{ duration: dNormal, start: 0.96, easing: cubicOut }}
		>
			{@render children()}
		</div>
	</div>
{/if}
