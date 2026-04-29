<script lang="ts" generics="T extends string">
/**
 * 4/30 user 検収 #12: native `<select>` の OS dropdown は Windows 上で背景白固定
 * (CSS で制御不可) のため、ダークテーマで option list が読めなかった。
 *
 * 本 component は完全に DOM 制御の dropdown で `<button role="listbox">` ベース。
 * 全 trigger / option / hover state が `var(--ag-*)` token 経由で塗られる。
 *
 * 引用元 guideline:
 * - docs/desktop_ui_ux_agent_rules.md P5 (OS / 業界慣習) / P6 (a11y)
 * - docs/l1_requirements/ux_standards.md §3-2 (text コントラスト) / §6-3 (Dialog)
 * - docs/l0_ideas/arcagate-visual-language.md 「よく磨かれた工具」
 */
import { ChevronDown } from '@lucide/svelte';

interface Option<TValue = string> {
	value: TValue;
	label: string;
}

interface Props<TValue extends string = string> {
	value: TValue;
	options: Option<TValue>[];
	onChange: (value: TValue) => void;
	'aria-label'?: string;
	id?: string;
	placeholder?: string;
}

let {
	value,
	options,
	onChange,
	'aria-label': ariaLabel,
	id,
	placeholder = '選択...',
}: Props<T> = $props();

let open = $state(false);
let triggerRef = $state<HTMLButtonElement | null>(null);
let listRef = $state<HTMLUListElement | null>(null);

let selectedOption = $derived(options.find((o) => o.value === value));

function selectOption(opt: Option<T>) {
	onChange(opt.value);
	open = false;
	queueMicrotask(() => triggerRef?.focus());
}

function moveFocus(delta: number) {
	if (!listRef) return;
	const buttons = listRef.querySelectorAll<HTMLButtonElement>('button[role="option"]');
	if (buttons.length === 0) return;
	const current = document.activeElement as HTMLElement | null;
	const idx = Array.from(buttons).indexOf(current as HTMLButtonElement);
	const next = idx === -1 ? 0 : (idx + delta + buttons.length) % buttons.length;
	buttons[next]?.focus();
}

$effect(() => {
	if (!open) return;
	function onClickOutside(e: PointerEvent) {
		const target = e.target as HTMLElement | null;
		if (!triggerRef?.contains(target as Node) && !listRef?.contains(target as Node)) {
			open = false;
		}
	}
	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			open = false;
			triggerRef?.focus();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			moveFocus(1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			moveFocus(-1);
		}
	}
	document.addEventListener('pointerdown', onClickOutside);
	document.addEventListener('keydown', onKeyDown);
	return () => {
		document.removeEventListener('pointerdown', onClickOutside);
		document.removeEventListener('keydown', onKeyDown);
	};
});

function onTriggerKeyDown(e: KeyboardEvent) {
	if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
		e.preventDefault();
		open = true;
		queueMicrotask(() => {
			const buttons = listRef?.querySelectorAll<HTMLButtonElement>('button[role="option"]');
			if (!buttons || buttons.length === 0) return;
			const currentIdx = options.findIndex((o) => o.value === value);
			buttons[currentIdx >= 0 ? currentIdx : 0]?.focus();
		});
	}
}
</script>

<div class="relative">
	<button
		type="button"
		bind:this={triggerRef}
		{id}
		aria-label={ariaLabel}
		aria-haspopup="listbox"
		aria-expanded={open}
		class="flex w-full items-center justify-between gap-2 rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)]"
		onclick={() => (open = !open)}
		onkeydown={onTriggerKeyDown}
	>
		<span class="min-w-0 flex-1 truncate text-left {!selectedOption ? 'text-[var(--ag-text-muted)]' : ''}"
			>{selectedOption?.label ?? placeholder}</span
		>
		<ChevronDown
			class="h-4 w-4 shrink-0 text-[var(--ag-text-muted)] transition-transform duration-[var(--ag-duration-fast)] motion-reduce:transition-none {open
				? 'rotate-180'
				: ''}"
		/>
	</button>
	{#if open}
		<ul
			bind:this={listRef}
			role="listbox"
			class="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] py-1 shadow-[var(--ag-shadow-md,0_4px_12px_rgba(0,0,0,0.25))]"
		>
			{#each options as opt (opt.value)}
				<li>
					<button
						type="button"
						role="option"
						aria-selected={value === opt.value}
						class="flex w-full items-center px-3 py-1.5 text-left text-sm text-[var(--ag-text-primary)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:bg-[var(--ag-surface-3)] focus:bg-[var(--ag-surface-3)] hover:bg-[var(--ag-surface-3)] {value ===
						opt.value
							? 'bg-[var(--ag-surface-3)] font-medium'
							: ''}"
						onclick={() => selectOption(opt)}
					>
						{opt.label}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
