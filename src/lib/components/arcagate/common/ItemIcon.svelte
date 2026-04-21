<script lang="ts">
import { AppWindow } from '@lucide/svelte';
import { convertFileSrc } from '@tauri-apps/api/core';

interface Props {
	iconPath: string | null | undefined;
	alt: string;
	class?: string;
}

let { iconPath, alt, class: className = '' }: Props = $props();
let iconSrc = $derived(iconPath ? convertFileSrc(iconPath) : null);
let iconError = $state(false);

// アイコンパスが変わったらエラー状態をリセット
$effect(() => {
	iconPath;
	iconError = false;
});
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
	<AppWindow class="{className} text-[var(--ag-text-muted)]" />
{/if}
