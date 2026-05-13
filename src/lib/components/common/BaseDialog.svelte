<script lang="ts">
import type { Snippet } from 'svelte';
import { tick } from 'svelte';
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
	/**
	 * 内側 box に追加する class。`max-h-[85vh] overflow-y-auto` (scrollable) や
	 * `!p-0 flex flex-col` (3-pane layout) 等の caller 固有要件を吸収するため。
	 *
	 * 5% の outlier (CardOverrideDialog scrollable / WidgetSettingsDialog 3-pane) を
	 * variant prop 爆発させずに 1 prop で吸収する設計判断 (anti-pattern §5 回避)。
	 */
	boxClass?: string;
	children: Snippet;
}

let {
	open,
	onClose,
	ariaLabelledby,
	ariaDescribedby,
	size = 'sm',
	boxClass = '',
	children,
}: Props = $props();

const rm =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;

const sizeClass = $derived(
	size === 'sm' ? 'max-w-sm' : size === 'md' ? 'max-w-md' : size === 'lg' ? 'max-w-lg' : 'max-w-xl',
);

// audit 2026-05-13 F6+G5: focus trap + focus restore (a11y N4)。
// Codex pitfall P2: IME composition (keyCode=229 / isComposing) を escape。
// 旧 trigger element を open 時に保存 → close 時に restore、 Tab 横取りで dialog 内 cycle。
let dialogEl = $state<HTMLDivElement | null>(null);
let previousFocus: HTMLElement | null = null;

function getFocusableElements(root: HTMLElement): HTMLElement[] {
	const selector =
		'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
	return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
		(el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement,
	);
}

function handleTab(e: KeyboardEvent) {
	if (!open || e.key !== 'Tab' || !dialogEl) return;
	// Codex pitfall P2: IME composition 中は無干渉 (keyCode=229 / e.isComposing)。
	if (e.isComposing || e.keyCode === 229) return;
	const focusables = getFocusableElements(dialogEl);
	if (focusables.length === 0) return;
	const first = focusables[0];
	const last = focusables[focusables.length - 1];
	const active = document.activeElement as HTMLElement | null;
	if (e.shiftKey) {
		if (active === first || !dialogEl.contains(active)) {
			e.preventDefault();
			last.focus();
		}
	} else {
		if (active === last) {
			e.preventDefault();
			first.focus();
		}
	}
}

$effect(() => {
	if (open) {
		previousFocus = (document.activeElement as HTMLElement) ?? null;
		void tick().then(() => {
			if (!dialogEl) return;
			const focusables = getFocusableElements(dialogEl);
			if (focusables.length > 0) focusables[0].focus();
			else dialogEl.focus();
		});
	} else if (previousFocus) {
		previousFocus.focus?.();
		previousFocus = null;
	}
});
</script>

<!-- Escape close: window listener で root-cause fix。modal div 上の onkeydown は trigger
     button から focus が移動しないため発火しない (refactor/escape-key-fix の精神を継承)。
     audit F6+G5: focus trap (Tab cycle) + IME 干渉回避を追加。 -->
<svelte:window
	onkeydown={(e) => {
		if (!open) return;
		if (e.key === 'Escape') onClose();
		else if (e.key === 'Tab') handleTab(e);
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
			bind:this={dialogEl}
			class="w-full {sizeClass} rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] p-6 shadow-[var(--ag-shadow-dialog)] {boxClass}"
			tabindex="-1"
			transition:scale={{ duration: dNormal, start: 0.96, easing: cubicOut }}
		>
			{@render children()}
		</div>
	</div>
{/if}
