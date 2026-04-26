<script lang="ts">
import { HelpCircle, X as XIcon } from '@lucide/svelte';
import { tick } from 'svelte';
import { fade, fly } from 'svelte/transition';
import { GLOBAL_HOTKEYS, SCREENS } from '$lib/help-content';
import { helpStore } from '$lib/state/help.svelte';

const rm =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;

// PH-423 / Codex Q5 #7: a11y focus trap
let panelEl = $state<HTMLDivElement | null>(null);
let closeBtnEl = $state<HTMLButtonElement | null>(null);
let previousActive = $state<HTMLElement | null>(null);

// 開いた瞬間に previousActive を保存 + close ボタンに初期フォーカス
$effect(() => {
	if (!helpStore.isOpen) return;
	previousActive = (document.activeElement as HTMLElement) ?? null;
	void tick().then(() => {
		closeBtnEl?.focus();
	});
});

function handleClose() {
	helpStore.close();
	// 閉じた直後にフォーカスを開く前の要素に戻す
	void tick().then(() => {
		previousActive?.focus();
		previousActive = null;
	});
}

function handleKeydown(e: KeyboardEvent) {
	if (!helpStore.isOpen) return;
	if (e.key === 'Escape') {
		e.preventDefault();
		handleClose();
		return;
	}
	if (e.key !== 'Tab' || !panelEl) return;
	// focus trap: panel 内のフォーカス可能要素を循環
	const focusable = panelEl.querySelectorAll<HTMLElement>(
		'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
	);
	if (focusable.length === 0) return;
	const first = focusable[0];
	const last = focusable[focusable.length - 1];
	const active = document.activeElement as HTMLElement | null;
	if (e.shiftKey && active === first) {
		e.preventDefault();
		last.focus();
	} else if (!e.shiftKey && active === last) {
		e.preventDefault();
		first.focus();
	}
}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if helpStore.isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		bind:this={panelEl}
		class="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-8"
		role="dialog"
		aria-modal="true"
		aria-labelledby="help-panel-title"
		data-testid="help-panel"
		transition:fade={{ duration: dFast }}
		onclick={(e) => {
			// Esc キーは onkeydown 経由 (focus trap と統合)
			if (e.target === e.currentTarget) handleClose();
		}}
		onkeydown={handleKeydown}
		tabindex="-1"
	>
		<div
			class="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-1)] shadow-xl"
			transition:fly={{ y: -16, duration: dNormal }}
		>
			<header
				class="flex items-center justify-between border-b border-[var(--ag-border)] px-6 py-4"
			>
				<div class="flex items-center gap-2">
					<HelpCircle class="h-5 w-5 text-[var(--ag-accent)]" />
					<h2
						id="help-panel-title"
						class="text-base font-semibold text-[var(--ag-text-primary)]"
					>
						ヘルプ
					</h2>
				</div>
				<button
					bind:this={closeBtnEl}
					type="button"
					class="rounded p-1.5 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-2)] hover:text-[var(--ag-text-primary)]"
					aria-label="ヘルプを閉じる"
					onclick={handleClose}
					data-testid="help-panel-close"
				>
					<XIcon class="h-4 w-4" />
				</button>
			</header>

			<div class="flex-1 overflow-y-auto px-6 py-4">
				<section class="mb-6">
					<h3 class="mb-3 text-sm font-semibold text-[var(--ag-text-primary)]">
						グローバルホットキー
					</h3>
					<ul class="space-y-2">
						{#each GLOBAL_HOTKEYS as h}
							<li class="flex items-baseline gap-3 text-sm">
								<kbd
									class="rounded border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2 py-0.5 font-mono text-xs text-[var(--ag-text-primary)]"
								>
									{h.keys}
								</kbd>
								<span class="text-[var(--ag-text-secondary)]">{h.description}</span>
							</li>
						{/each}
					</ul>
				</section>

				{#each SCREENS as screen (screen.id)}
					<section class="mb-6">
						<h3 class="mb-3 text-sm font-semibold text-[var(--ag-text-primary)]">
							{screen.title}
						</h3>
						{#if screen.hotkeys.length > 0}
							<ul class="mb-3 space-y-2">
								{#each screen.hotkeys as h}
									<li class="flex items-baseline gap-3 text-sm">
										<kbd
											class="rounded border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2 py-0.5 font-mono text-xs text-[var(--ag-text-primary)]"
										>
											{h.keys}
										</kbd>
										<span class="text-[var(--ag-text-secondary)]">{h.description}</span>
									</li>
								{/each}
							</ul>
						{/if}
						{#if screen.tips.length > 0}
							<ul class="list-disc space-y-1 pl-5 text-sm text-[var(--ag-text-secondary)]">
								{#each screen.tips as tip}
									<li>{tip}</li>
								{/each}
							</ul>
						{/if}
					</section>
				{/each}
			</div>

			<footer
				class="border-t border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-6 py-3 text-xs text-[var(--ag-text-muted)]"
			>
				詳細は <code class="font-mono">README.md</code> および
				<a
					href="https://github.com/emanon-i/arcagate"
					target="_blank"
					rel="noopener noreferrer"
					class="underline transition-colors duration-[var(--ag-duration-fast)] hover:text-[var(--ag-accent)]"
				>
					GitHub リポジトリ
				</a> を参照
			</footer>
		</div>
	</div>
{/if}
