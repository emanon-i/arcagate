<script lang="ts">
interface Props {
	label: string;
	value: string;
}

let { label, value }: Props = $props();
</script>

<div class="flex items-start justify-between gap-4 rounded-2xl bg-[var(--ag-surface-3)] px-3 py-2.5">
	<span class="text-[var(--ag-text-muted)]">{label}</span>
	<span class="max-w-[190px] text-right text-[var(--ag-text-secondary)]">{value}</span>
</div>
