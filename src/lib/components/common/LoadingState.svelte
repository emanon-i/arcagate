<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';

interface Props {
	description?: string;
	/** 任意のアクション (例: 長い処理の「中止」)。指定時 spinner の下に button を出す。 */
	action?: { label: string; onClick: () => void };
	testId?: string;
}

let { description, action, testId }: Props = $props();
let resolvedDescription = $derived(description ?? t('common.loading'));
</script>

<div
	class="flex h-full w-full flex-col items-center justify-center gap-3 px-6 py-8 text-center"
	role="status"
	aria-live="polite"
	data-testid={testId}
>
	<div class="flex items-center gap-3">
		<span
			class="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--ag-accent)] border-t-transparent motion-reduce:hidden"
		></span>
		<span class="text-sm text-[var(--ag-text-muted)]">{resolvedDescription}</span>
	</div>
	{#if action}
		<Button type="button" variant="outline" size="sm" onclick={action.onClick}>
			{action.label}
		</Button>
	{/if}
</div>
