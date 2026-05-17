<script lang="ts">
import { Dialog } from 'bits-ui';
import type { Snippet } from 'svelte';
import { cubicOut } from 'svelte/easing';
import { fade, scale } from 'svelte/transition';

/**
 * BaseDialog (audit 2026-05-14 rank 4: bits-ui Dialog primitives 経由に rewrite)。
 *
 * 旧実装: custom `<div role="dialog">` + 自前 focus trap + 自前 Escape listener + 自前 backdrop click。
 * 新実装: bits-ui Dialog (FocusScope + EscapeLayer + DismissibleLayer + PresenceLayer + ScrollLock) に delegate。
 *
 * a11y 改善:
 * - FocusScope: bits-ui の堅牢な focus trap (= 自前実装より edge case 対応 ↑)
 * - EscapeLayer: layered Esc handling (= nested dialog でも適切に dismiss)
 * - DismissibleLayer: backdrop click + 外側 click 統合
 * - ScrollLock: body scroll lock (= 旧実装に欠けていた、 dialog 開いて背面 scroll 防止)
 * - Portal: portal rendering で z-index 問題回避
 *
 * 互換性保持 (caller 側 caller 0 変更):
 * - props: `open` / `onClose` / `ariaLabelledby?` / `ariaDescribedby?` / `size?` / `boxClass?` / `disableFocusTrap?` / `children`
 * - 既存 fade + scale transition を Overlay + Content に維持
 * - prefers-reduced-motion 対応 (motion-reduce 時 duration=0)
 *
 * Codex pitfall P2: IME composition は bits-ui FocusScope が内部で適切に handle (= 旧実装の e.isComposing check 不要)。
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
	 */
	boxClass?: string;
	/**
	 * focus trap を opt-out する prop (default false)。
	 * LibraryItemPicker 等の「search input が常時 focus 維持」 contract を持つ dialog で true 指定。
	 */
	disableFocusTrap?: boolean;
	children: Snippet;
}

let {
	open,
	onClose,
	ariaLabelledby,
	ariaDescribedby,
	size = 'sm',
	boxClass = '',
	disableFocusTrap = false,
	children,
}: Props = $props();

const rm =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;

const sizeClass = $derived(
	size === 'sm' ? 'max-w-sm' : size === 'md' ? 'max-w-md' : size === 'lg' ? 'max-w-lg' : 'max-w-xl',
);

function handleOpenChange(next: boolean): void {
	if (!next) onClose();
}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Portal>
		<Dialog.Overlay
			class="fixed inset-0 z-50 bg-black/50"
			forceMount
		>
			{#snippet child({ props, open: isOpen })}
				{#if isOpen}
					<div {...props} transition:fade={{ duration: dFast }}></div>
				{/if}
			{/snippet}
		</Dialog.Overlay>
		<Dialog.Content
			class="ag-glass fixed left-1/2 top-1/2 z-50 w-full {sizeClass} -translate-x-1/2 -translate-y-1/2 rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] p-6 shadow-[var(--ag-shadow-dialog)] {boxClass}"
			aria-labelledby={ariaLabelledby}
			aria-describedby={ariaDescribedby}
			trapFocus={!disableFocusTrap}
			forceMount
		>
			{#snippet child({ props, open: isOpen })}
				{#if isOpen}
					<div {...props} transition:scale={{ duration: dNormal, start: 0.96, easing: cubicOut }}>
						{@render children()}
					</div>
				{/if}
			{/snippet}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
