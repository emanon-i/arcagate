<script lang="ts">
interface Props {
	keys: string;
	description: string;
}

let { keys, description }: Props = $props();
</script>

<span class="rounded-[var(--ag-radius-keyhint)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2 py-1 text-xs text-[var(--ag-text-muted)]">
	{keys} {description}
</span>
