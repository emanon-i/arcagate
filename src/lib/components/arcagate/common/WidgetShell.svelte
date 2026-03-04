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
	badge?: string;
	source?: string;
	menuItems?: MenuItem[];
	children: Snippet;
}

let { title, icon: Icon, badge, source, menuItems = [], children }: Props = $props();
</script>

<div class="relative rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] p-4 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
	{#if menuItems.length > 0}
		<div class="absolute right-3 top-3">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger
					class="rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface-4)] p-1.5 text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-3)]"
					aria-label="{title} の設定メニュー"
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
	{:else}
		<button
			type="button"
			aria-label="{title} の設定メニュー"
			class="absolute right-3 top-3 rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface-4)] p-1.5 text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-3)]"
		>
			<MoreHorizontal class="h-4 w-4" />
		</button>
	{/if}

	<div class="mb-4 flex items-center justify-between gap-3">
		<div class="flex min-w-0 items-center gap-2.5">
			<div class="rounded-2xl border border-[var(--ag-border)] bg-[var(--ag-surface-4)] p-2">
				<Icon class="h-4 w-4 text-[var(--ag-text-secondary)]" />
			</div>
			<div class="min-w-0">
				<div class="truncate text-sm font-semibold text-[var(--ag-text-primary)]">{title}</div>
				{#if source}
					<div class="text-[11px] text-[var(--ag-text-faint)]">{source}</div>
				{/if}
			</div>
		</div>
		{#if badge}
			<span class="text-xs text-[var(--ag-text-muted)]">{badge}</span>
		{/if}
	</div>

	{@render children()}
</div>
