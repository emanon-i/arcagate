<script lang="ts">
import { t } from '$lib/i18n.svelte';

interface Props {
	description?: string;
	testId?: string;
}

let { description, testId }: Props = $props();
let resolvedDescription = $derived(description ?? t('common.loading'));
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
	<span class="text-sm text-[var(--ag-text-muted)]">{resolvedDescription}</span>
</div>
