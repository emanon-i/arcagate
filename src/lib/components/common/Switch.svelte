<script lang="ts">
/**
 * PH-issue-026 (Issue 23): 汎用 switch component。
 * AutostartToggle と同じ pattern (button + role="switch" + thumb translate)。
 *
 * 引用元 guideline:
 * - docs/desktop_ui_ux_agent_rules.md P1 (操作可視化、状態が一目で分かる) / P2 (反応即時) / P4 (一貫性)
 * - docs/l1_requirements/ux_standards.md §5 インタラクションフィードバック / §6-3 Settings
 */
interface Props {
	checked: boolean;
	onChange: (next: boolean) => void;
	'aria-label'?: string;
	disabled?: boolean;
}

let { checked, onChange, 'aria-label': ariaLabel, disabled = false }: Props = $props();

function toggle() {
	if (disabled) return;
	onChange(!checked);
}

function handleKey(e: KeyboardEvent) {
	if (e.key === ' ' || e.key === 'Enter') {
		e.preventDefault();
		toggle();
	}
}
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	aria-label={ariaLabel}
	{disabled}
	class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-[var(--ag-border)] transition-[background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ag-surface-1)] disabled:cursor-not-allowed disabled:opacity-50 {checked
		? 'bg-[var(--ag-accent)]'
		: 'bg-[var(--ag-surface-3)]'}"
	onclick={toggle}
	onkeydown={handleKey}
>
	<span
		class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none {checked
			? 'translate-x-6'
			: 'translate-x-1'}"
		aria-hidden="true"
	></span>
</button>
