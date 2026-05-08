<script lang="ts">
import { X as XIcon } from '@lucide/svelte';
import { cubicOut } from 'svelte/easing';
import { fade, scale } from 'svelte/transition';
import ItemFormCardOverride from '$lib/components/item/ItemFormCardOverride.svelte';
import type { Item } from '$lib/types/item';

/**
 * F-5 (2026-05-08 user 検収): カード個別設定 modal。
 *
 * E-3 で ItemForm 内に直接埋め込んだ構造から、detail panel から呼び出す独立 modal に変更。
 * 内部で `ItemFormCardOverride` を render、card_override 編集 UI 全部を modal 内に集約。
 *
 * 開閉:
 * - LibraryDetailPanel から `<CardOverrideDialog open={...} item={...} onClose={...} />` で配置
 * - Escape / 背景クリック / × button で close
 *
 * 既知の design intent: ItemFormCardOverride 自身は「個別調整 ON/OFF」 button 内蔵だが、
 * F-5 仕様では panel 側に checkbox を置くため、ON 時に modal 開く前提で機能 OK。
 * (modal を開く button は ON 時のみ enable される、panel 側の制御)。
 */
interface Props {
	open: boolean;
	item: Item;
	onClose: () => void;
}

let { open, item, onClose }: Props = $props();

function handleBackdropClick(e: MouseEvent): void {
	if (e.target === e.currentTarget) {
		onClose();
	}
}

function handleKeydown(e: KeyboardEvent): void {
	if (open && e.key === 'Escape') {
		onClose();
	}
}

const rm =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		aria-labelledby="card-override-dialog-title"
		tabindex="-1"
		transition:fade={{ duration: dFast }}
		onclick={handleBackdropClick}
	>
		<div
			class="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] p-6 shadow-[var(--ag-shadow-dialog)]"
			transition:scale={{ duration: dNormal, start: 0.96, easing: cubicOut }}
		>
			<div class="mb-4 flex items-center justify-between gap-2">
				<h2
					id="card-override-dialog-title"
					class="text-lg font-semibold text-[var(--ag-text-primary)]"
				>
					カード個別設定
				</h2>
				<button
					type="button"
					class="rounded-lg p-1 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)]"
					aria-label="閉じる"
					onclick={onClose}
				>
					<XIcon class="h-4 w-4" />
				</button>
			</div>

			<ItemFormCardOverride {item} />
		</div>
	</div>
{/if}
