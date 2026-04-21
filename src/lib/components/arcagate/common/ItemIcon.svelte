<script lang="ts">
import { AppWindow, Box, FileText, Folder, Globe, Terminal } from '@lucide/svelte';
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
	url: Globe,
	folder: Folder,
	file: FileText,
	app: AppWindow,
	command: Terminal,
};

let FallbackIcon = $derived(
	(itemType ? (fallbackIconMap[itemType] ?? Box) : AppWindow) as Component,
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
