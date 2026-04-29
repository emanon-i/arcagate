<script lang="ts">
/**
 * PH-issue-030 / 検収項目 #22: フォントサイズ選択を視覚的に分かりやすく改修。
 *
 * 旧実装は単純な select で「小 / 中（デフォルト）/ 大」 → 実際にどのサイズになるかが見えない。
 * 本実装は 3 つの大きな chip button で実 size を preview 表示する。
 *
 * 引用元 guideline:
 * - docs/desktop_ui_ux_agent_rules.md P1 操作可視化 / P11 装飾より対象
 * - docs/l1_requirements/ux_standards.md §5 インタラクションフィードバック
 */
interface Props {
	config: { font_size?: 'sm' | 'md' | 'lg' };
}

let { config = $bindable() }: Props = $props();

let fontSize = $derived<'sm' | 'md' | 'lg'>(config.font_size ?? 'md');

const SIZES: { value: 'sm' | 'md' | 'lg'; label: string; previewClass: string }[] = [
	{ value: 'sm', label: '小', previewClass: 'text-sm' },
	{ value: 'md', label: '中', previewClass: 'text-base' },
	{ value: 'lg', label: '大', previewClass: 'text-lg' },
];

function setSize(v: 'sm' | 'md' | 'lg') {
	config = { ...config, font_size: v };
}
</script>

<div class="space-y-1">
	<p class="text-sm font-medium text-[var(--ag-text-primary)]">フォントサイズ</p>
	<div class="grid grid-cols-3 gap-2">
		{#each SIZES as size (size.value)}
			{@const isActive = fontSize === size.value}
			<button
				type="button"
				class="flex flex-col items-center justify-center gap-1 rounded-[var(--ag-radius-input)] border px-3 py-3 transition-[background-color,border-color] duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {isActive
					? 'border-[var(--ag-accent)] bg-[var(--ag-accent-bg)]'
					: 'border-[var(--ag-border)] bg-[var(--ag-surface-2)] hover:border-[var(--ag-border-hover)] hover:bg-[var(--ag-surface-3)]'}"
				aria-pressed={isActive}
				aria-label="フォントサイズ: {size.label}"
				onclick={() => setSize(size.value)}
			>
				<span
					class="font-medium {size.previewClass} {isActive
						? 'text-[var(--ag-accent-text)]'
						: 'text-[var(--ag-text-primary)]'}"
				>あ</span>
				<span
					class="text-xs {isActive
						? 'text-[var(--ag-accent-text)]'
						: 'text-[var(--ag-text-muted)]'}"
				>{size.label}{size.value === 'md' ? '（既定）' : ''}</span>
			</button>
		{/each}
	</div>
</div>
