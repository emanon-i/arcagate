<script lang="ts">
import type { Component } from 'svelte';
import { Button } from '$lib/components/ui/button';

interface Props {
	icon: Component;
	title: string;
	description?: string;
	action?: { label: string; onClick: () => void };
	testId?: string;
}

let { icon: Icon, title, description, action, testId }: Props = $props();
</script>

<div
	class="flex h-full w-full flex-col items-center justify-center gap-3 px-6 py-8 text-center"
	data-testid={testId}
>
	<div class="rounded-full bg-[var(--ag-surface-2)] p-4 text-[var(--ag-text-muted)]">
		<Icon class="h-8 w-8" />
	</div>
	<div class="space-y-1">
		<p class="text-sm font-medium text-[var(--ag-text-primary)]">{title}</p>
		{#if description}
			<p class="max-w-md text-xs text-[var(--ag-text-secondary)]">{description}</p>
		{/if}
	</div>
	{#if action}
		<Button type="button" variant="outline" size="sm" onclick={action.onClick}>
			{action.label}
		</Button>
	{/if}
</div>
