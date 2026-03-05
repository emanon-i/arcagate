<script lang="ts">
import {
	Calculator,
	Clipboard,
	Cpu,
	FolderOpen,
	Gamepad2,
	Globe,
	TerminalSquare,
} from '@lucide/svelte';
import type { Component } from 'svelte';
import type { ItemType } from '$lib/types/item';
import type { PaletteEntry } from '$lib/types/palette';

interface Props {
	entry: PaletteEntry;
	active?: boolean;
	index?: number;
	onclick?: () => void;
}

let { entry, active = false, index = 0, onclick }: Props = $props();

const typeIconMap: Record<ItemType, Component> = {
	exe: Gamepad2,
	url: Globe,
	script: TerminalSquare,
	folder: FolderOpen,
	command: Cpu,
};

const typeAccentMap: Record<ItemType, string> = {
	exe: 'from-violet-500/30 to-fuchsia-500/20',
	url: 'from-emerald-500/30 to-teal-500/20',
	script: 'from-cyan-500/30 to-sky-500/20',
	folder: 'from-amber-500/30 to-orange-500/20',
	command: 'from-pink-500/30 to-rose-500/20',
};

function getDisplay(e: PaletteEntry): {
	icon: Component;
	title: string;
	subtitle: string;
	meta: string;
	accent: string;
} {
	switch (e.kind) {
		case 'item':
			return {
				icon: typeIconMap[e.item.item_type],
				title: e.item.label,
				subtitle: `${e.item.item_type} · ${e.item.target}`,
				meta: e.item.aliases.length > 0 ? `alias: ${e.item.aliases[0]}` : '',
				accent: typeAccentMap[e.item.item_type],
			};
		case 'calc':
			return {
				icon: Calculator,
				title: `= ${e.expression}`,
				subtitle: 'Built-in Calculator',
				meta: e.result,
				accent: 'from-pink-500/30 to-rose-500/20',
			};
		case 'clipboard':
			return {
				icon: Clipboard,
				title: e.text.length > 60 ? `${e.text.slice(0, 60)}…` : e.text,
				subtitle: 'Clipboard History',
				meta: `#${e.index + 1}`,
				accent: 'from-slate-500/30 to-zinc-500/20',
			};
	}
}

let display = $derived(getDisplay(entry));
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="flex items-center justify-between gap-3 rounded-[22px] border px-4 py-3 transition {active
		? 'border-cyan-400/25 bg-cyan-400/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
		: 'border-[var(--ag-border)] bg-white/[0.03]'}"
	role="option"
	aria-selected={active}
	data-testid="palette-result-{index}"
	onclick={onclick}
>
	<div class="flex min-w-0 items-center gap-3">
		<div
			class="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br {display.accent} ring-1 ring-white/10"
		>
			<display.icon class="h-5 w-5 text-white" />
		</div>
		<div class="min-w-0">
			<div class="truncate text-sm font-semibold text-[var(--ag-text-primary)]">{display.title}</div>
			<div class="truncate text-xs text-[var(--ag-text-muted)]">{display.subtitle}</div>
		</div>
	</div>

	<div class="text-right">
		<div class="text-xs text-[var(--ag-text-muted)]">{display.meta}</div>
		{#if active}
			<div class="mt-1 text-[11px] text-[var(--ag-accent-text)]">Enter で起動</div>
		{/if}
	</div>
</div>
