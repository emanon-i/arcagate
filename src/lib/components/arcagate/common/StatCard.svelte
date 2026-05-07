<script lang="ts">
/**
 * StatCard — Library 概要 stats 表示。
 *
 * L2-A A4 (smoke): Industrial Yellow token に切替え。
 * - bg: --ag-il-paper
 * - border: --ag-il-border
 * - radius: --ag-il-radius-card (≤8px、控えめ)
 * - text: --ag-il-ink (label) / --ag-il-ink (value、強調)
 *
 * spec: docs/l1_requirements/design/industrial-yellow-spec.md §2.2 / §3.1
 * 旧 token (--ag-surface-2 等) は他 widget で継続使用、本 component のみ移行。
 */
interface Props {
	label: string;
	value: string | number;
}

let { label, value }: Props = $props();
</script>

<div
	class="border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] p-4"
	style="border-radius: var(--ag-radius-card);"
>
	<div class="text-xs text-[var(--ag-text-primary)] opacity-70">{label}</div>
	<div class="mt-2 text-2xl font-semibold text-[var(--ag-text-primary)]">{value}</div>
</div>
