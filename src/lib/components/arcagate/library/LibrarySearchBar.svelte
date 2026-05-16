<script lang="ts">
import { Search, X as XIcon } from '@lucide/svelte';
import { t } from '$lib/i18n.svelte';

/**
 * Library 検索 input。
 *
 * 引用元 guideline:
 *   docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、search bar 抽出)
 *
 * - bind:value で親に query を返す
 * - Ctrl/Cmd+F / `/` (input 外) で input にフォーカス
 * - Escape: 値あればクリア、無ければ blur
 */
interface Props {
	value: string;
}

let { value = $bindable('') }: Props = $props();

let inputEl = $state<HTMLInputElement | null>(null);

function focusInput() {
	inputEl?.focus();
	inputEl?.select();
}
</script>

<svelte:window
	onkeydown={(e) => {
		// L2-B B3: Ctrl/Cmd+F で search input にフォーカス (browser default の Find は dev tool 経由で代替)
		if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
			e.preventDefault();
			focusInput();
			return;
		}
		if (e.key === '/') {
			const target = e.target as HTMLElement;
			if (
				target.tagName !== 'INPUT' &&
				target.tagName !== 'TEXTAREA' &&
				!target.isContentEditable
			) {
				e.preventDefault();
				inputEl?.focus();
			}
		}
	}}
/>

<div
	class="flex min-w-0 flex-1 items-center gap-3 rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-4 py-3"
>
	<Search class="h-5 w-5 text-[var(--ag-text-muted)]" />
	<input
		type="text"
		class="flex-1 bg-transparent text-sm text-[var(--ag-text-primary)] outline-none placeholder:text-[var(--ag-text-muted)]"
		placeholder={t('library.search_placeholder')}
		autocomplete="off"
		bind:value
		bind:this={inputEl}
		onkeydown={(e) => {
			if (e.key === 'Escape') {
				// 1 段目 ESC: 値があればクリア、無ければ blur (search bar からフォーカス外す)。
				// e2e G1 keyboard-dynamic で検証 (ESC で blur or clear のいずれか)。
				e.stopPropagation();
				if (value !== '') {
					value = '';
				} else {
					(e.currentTarget as HTMLInputElement).blur();
				}
			}
		}}
	/>
	{#if value}
		<button
			type="button"
			class="rounded-full p-0.5 text-[var(--ag-text-muted)] transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)] hover:text-[var(--ag-text-primary)]"
			aria-label={t('palette.clear_search')}
			onclick={() => {
				value = '';
				focusInput();
			}}
		>
			<XIcon class="h-4 w-4" />
		</button>
	{/if}
</div>
