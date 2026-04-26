<script lang="ts">
interface Props {
	description?: string;
	testId?: string;
}

let { description = '読み込み中...', testId }: Props = $props();
</script>

<div
	class="flex h-full w-full items-center justify-center gap-3 px-6 py-8 text-center"
	role="status"
	aria-live="polite"
	data-testid={testId}
>
	<span
		class="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--ag-accent)] border-t-transparent motion-reduce:hidden"
	></span>
	<span class="text-sm text-[var(--ag-text-muted)]">{description}</span>
</div>
