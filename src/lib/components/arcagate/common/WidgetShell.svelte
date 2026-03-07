<script lang="ts">
import { MoreHorizontal } from '@lucide/svelte';
import type { Component, Snippet } from 'svelte';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

interface MenuItem {
	label: string;
	onclick: () => void;
}

interface Props {
	title: string;
	icon: Component;
	menuItems?: MenuItem[];
	children: Snippet;
}

let { title, icon: Icon, menuItems = [], children }: Props = $props();
</script>

<div class="relative rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] p-4 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
	{#if menuItems.length > 0}
		<div class="absolute right-3 top-3">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger
					class="rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface-4)] p-1.5 text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-3)]"
					aria-label="{title} メニュー"
				>
					<MoreHorizontal class="h-4 w-4" />
				</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					{#each menuItems as item}
						<DropdownMenu.Item onclick={item.onclick}>{item.label}</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	{/if}

	<div class="mb-3 flex items-center gap-2">
		<div class="rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface-4)] p-1.5">
			<Icon class="h-4 w-4 text-[var(--ag-text-secondary)]" />
		</div>
		<div class="truncate text-sm font-semibold text-[var(--ag-text-primary)]">{title}</div>
	</div>

	{@render children()}
</div>
