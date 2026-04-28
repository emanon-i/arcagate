<script lang="ts">
/**
 * PH-widget-polish: 旧 checkbox + 説明文の二重表示を解消、proper switch UI に。
 * SettingsPanel が左側にラベル + 説明を持つので、本 component は switch のみ。
 *
 * 引用元 guideline:
 * - docs/desktop_ui_ux_agent_rules.md P1 (操作可視化、状態が一目で分かる) / P2 (反応即時)
 * - docs/l1_requirements/ux_standards.md §5 インタラクションフィードバック
 */
let {
	enabled,
	onChange,
}: {
	enabled: boolean;
	onChange: (enabled: boolean) => void;
} = $props();

function toggle() {
	onChange(!enabled);
}

function handleKey(e: KeyboardEvent) {
	if (e.key === ' ' || e.key === 'Enter') {
		e.preventDefault();
		toggle();
	}
}
</script>

<!-- Proper switch (button + role="switch")。
     track の背景色 + thumb の translate で ON/OFF を視覚化、active:scale で触覚フィードバック。 -->
<button
	type="button"
	role="switch"
	aria-checked={enabled}
	aria-label={enabled ? '自動起動を無効にする' : '自動起動を有効にする'}
	class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-[var(--ag-border)] transition-[background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ag-surface-1)] {enabled
		? 'bg-[var(--ag-accent)]'
		: 'bg-[var(--ag-surface-3)]'}"
	onclick={toggle}
	onkeydown={handleKey}
>
	<span
		class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none {enabled
			? 'translate-x-6'
			: 'translate-x-1'}"
		aria-hidden="true"
	></span>
</button>
