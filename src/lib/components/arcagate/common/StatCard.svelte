<script lang="ts">
/**
 * StatCard — Library 概要 stats 表示。
 *
 * design tokens v2 の semantic token (--ag-border / --ag-radius-card /
 * --ag-text-primary) で 5 テーマ共通描画。 旧 Industrial Yellow direction は撤回済。
 */
interface Props {
	label: string;
	value: string | number;
}

let { label, value }: Props = $props();
</script>

<div
	class="ag-glass border border-[var(--ag-border)] p-4"
	style="border-radius: var(--ag-radius-card);"
>
	<div class="text-xs text-[var(--ag-text-primary)] opacity-70">{label}</div>
	<div class="mt-2 text-2xl font-semibold text-[var(--ag-text-primary)]">{value}</div>
</div>
