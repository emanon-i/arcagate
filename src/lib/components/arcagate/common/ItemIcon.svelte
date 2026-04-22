<script lang="ts">
import { Cpu, FolderOpen, Gamepad2, Globe, TerminalSquare } from '@lucide/svelte';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { Component } from 'svelte';

interface Props {
	iconPath: string | null | undefined;
	alt: string;
	itemType?: string;
	class?: string;
}

let { iconPath, alt, itemType, class: className = '' }: Props = $props();
let iconSrc = $derived(iconPath ? convertFileSrc(iconPath) : null);
let iconError = $state(false);

// アイコンパスが変わったらエラー状態をリセット
$effect(() => {
	iconPath;
	iconError = false;
});

const fallbackIconMap: Record<string, Component> = {
	exe: Gamepad2,
	url: Globe,
	script: TerminalSquare,
	folder: FolderOpen,
	command: Cpu,
};

let FallbackIcon = $derived(
	(itemType ? (fallbackIconMap[itemType] ?? Gamepad2) : Gamepad2) as Component,
);
</script>

{#if iconSrc && !iconError}
	<img
		src={iconSrc}
		{alt}
		class={className}
		onerror={() => {
			iconError = true;
		}}
	/>
{:else}
	<FallbackIcon class="{className} text-[var(--ag-text-muted)]" />
{/if}
