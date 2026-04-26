<script lang="ts">
import { AlertTriangle } from '@lucide/svelte';
import { Button } from '$lib/components/ui/button';

interface Props {
	title: string;
	description?: string;
	retry?: { label: string; onClick: () => void };
	testId?: string;
}

let { title, description, retry, testId }: Props = $props();
</script>

<div
	class="flex h-full w-full flex-col items-center justify-center gap-3 px-6 py-8 text-center"
	role="alert"
	aria-live="assertive"
	data-testid={testId}
>
	<div class="rounded-full bg-[var(--ag-surface-2)] p-4 text-red-500">
		<AlertTriangle class="h-8 w-8" />
	</div>
	<div class="space-y-1">
		<p class="text-sm font-medium text-[var(--ag-text-primary)]">{title}</p>
		{#if description}
			<p class="max-w-md text-xs text-[var(--ag-text-secondary)]">{description}</p>
		{/if}
	</div>
	{#if retry}
		<Button type="button" variant="outline" size="sm" onclick={retry.onClick}>
			{retry.label}
		</Button>
	{/if}
</div>
