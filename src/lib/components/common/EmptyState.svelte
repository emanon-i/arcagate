<script lang="ts">
import type { Component } from 'svelte';
import { Button } from '$lib/components/ui/button';

// PH-424 / Codex Q5 #4: EmptyState actions slot 化 (複数導線 onboarding hint)
interface Action {
	label: string;
	onClick: () => void;
	variant?: 'default' | 'outline';
	icon?: Component;
}

interface Props {
	icon: Component;
	title: string;
	description?: string;
	action?: Action; // 後方互換 (単一)
	actions?: Action[]; // 複数 (PH-424 新規)
	testId?: string;
}

let { icon: Icon, title, description, action, actions, testId }: Props = $props();

// actions が指定されたらそれを使う、無ければ action (単一) から fallback、両方無ければ空
let resolvedActions = $derived<Action[]>(
	actions && actions.length > 0 ? actions : action ? [action] : [],
);
</script>

<!-- icon container は accent token (--ag-accent 系) の ring + tint で軽い雰囲気付け。
     全 token は base 非依存の派生層なので 5 テーマ共通で可視。 -->
<div
	class="flex h-full w-full flex-col items-center justify-center gap-3 px-6 py-8 text-center"
	data-testid={testId}
>
	<div
		class="rounded-full p-4 text-[var(--ag-accent)]"
		style="background: color-mix(in srgb, var(--ag-accent) 12%, transparent);"
	>
		<Icon class="h-8 w-8" />
	</div>
	<div class="space-y-1">
		<p class="text-sm font-medium text-[var(--ag-text-primary)]">{title}</p>
		{#if description}
			<p class="max-w-md text-xs text-[var(--ag-text-secondary)]">{description}</p>
		{/if}
	</div>
	{#if resolvedActions.length > 0}
		<div class="flex flex-wrap items-center justify-center gap-2">
			{#each resolvedActions as a, i (a.label)}
				{@const ActionIcon = a.icon}
				<Button
					type="button"
					variant={a.variant ?? (i === 0 ? 'default' : 'outline')}
					size="sm"
					onclick={a.onClick}
				>
					{#if ActionIcon}
						<ActionIcon class="h-3.5 w-3.5" />
					{/if}
					{a.label}
				</Button>
			{/each}
		</div>
	{/if}
</div>
