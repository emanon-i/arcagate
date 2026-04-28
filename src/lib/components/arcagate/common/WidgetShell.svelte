<script lang="ts">
import { MoreHorizontal } from '@lucide/svelte';
import type { Component, Snippet } from 'svelte';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

interface MenuItem {
	label: string;
	icon?: Component;
	onclick: () => void;
}

interface Props {
	title: string;
	icon: Component;
	menuItems?: MenuItem[];
	children: Snippet;
}

let { title, icon: Icon, menuItems = [], children }: Props = $props();

let btnClass =
	'rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface-4)] p-1.5 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-surface-3)]';
</script>

<div class="flex h-full flex-col rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] p-4 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-shadow duration-[var(--ag-duration-fast)] hover:shadow-md motion-reduce:transition-none">
	<!-- PH-issue-015: header layout 修正。
	     icon wrapper に shrink-0 + title div に min-w-0 flex-1 を付与し、
	     widget が狭くなっても title が icon に被らず truncate される。 -->
	<div class="mb-3 shrink-0 flex items-center justify-between gap-2">
		<div class="flex min-w-0 flex-1 items-center gap-2">
			<div class="shrink-0 rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface-4)] p-1.5">
				<Icon class="h-4 w-4 text-[var(--ag-text-secondary)]" />
			</div>
			<div class="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--ag-text-primary)]">{title}</div>
		</div>
		{#if menuItems.length === 1}
			{@const sole = menuItems[0]}
			{@const SoleIcon = sole.icon ?? MoreHorizontal}
			<button type="button" class={btnClass} aria-label={sole.label} onclick={sole.onclick}>
				<SoleIcon class="h-4 w-4" />
			</button>
		{:else if menuItems.length > 1}
			<DropdownMenu.Root>
				<DropdownMenu.Trigger class={btnClass} aria-label="{title} メニュー">
					<MoreHorizontal class="h-4 w-4" />
				</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					{#each menuItems as item}
						<DropdownMenu.Item onclick={item.onclick}>{item.label}</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		{/if}
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto">
		{@render children()}
	</div>
</div>
