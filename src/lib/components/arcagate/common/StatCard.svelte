<script lang="ts">
interface Props {
	label: string;
	value: string | number;
}

let { label, value }: Props = $props();
</script>

<div class="rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-4">
	<div class="text-xs text-[var(--ag-text-muted)]">{label}</div>
	<div class="mt-2 text-2xl font-semibold text-[var(--ag-text-primary)]">{value}</div>
</div>
